'use strict';
const admin = require('firebase-admin');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const DATABASE_URL = 'https://gg88-web-default-rtdb.asia-southeast1.firebasedatabase.app';
const TIMEOUT_MS = 12000;
function credentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Thiếu GOOGLE_SERVICE_ACCOUNT_JSON trong Vercel');
  let c;
  try { c = JSON.parse(raw); } catch (_) { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ'); }
  if (c.project_id !== 'gg88-web' || !c.client_email || !c.private_key) throw new Error('Service Account JSON thiếu thông tin hoặc không thuộc dự án gg88-web');
  c.private_key = c.private_key.replace(/\\n/g, '\n');
  return c;
}
function firebase() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(credentials()), databaseURL: DATABASE_URL });
  return admin;
}
function bounded(promise, label) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} không phản hồi trong ${TIMEOUT_MS / 1000} giây`)), TIMEOUT_MS); })]).finally(() => clearTimeout(timer));
}
const num = (row, i) => Number(row?.metricValues?.[i]?.value || 0);
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Bạn cần đăng nhập ADMIN' });
    const a = firebase();
    const decoded = await bounded(a.auth().verifyIdToken(auth.slice(7)), 'Firebase Authentication');
    const grant = await bounded(a.database().ref('adminUids/' + decoded.uid).get(), 'Firebase Realtime Database');
    if (grant.val() !== true) return res.status(403).json({ error: 'Tài khoản chưa được cấp quyền ADMIN' });
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!/^\d+$/.test(propertyId || '')) return res.status(503).json({ error: 'Thiếu GA4_PROPERTY_ID dạng số trong Vercel' });
    const client = new BetaAnalyticsDataClient({ credentials: credentials(), timeout: TIMEOUT_MS });
    const property = 'properties/' + propertyId;
    // Query each reporting period independently. GA4 does not support
    // `dateRange` as a dimension; activeUsers cannot be summed across days.
    const summaryMetrics = [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }, { name: 'newUsers' }];
    const summary = (startDate, label) => bounded(
      client.runReport({ property, dateRanges: [{ startDate, endDate: 'today' }], metrics: summaryMetrics }, { timeout: TIMEOUT_MS }),
      label
    );
    const [todayReport, weekReport, monthReport, realtime, daily, sources] = await Promise.all([
      summary('today', 'GA4 hôm nay'),
      summary('6daysAgo', 'GA4 7 ngày'),
      summary('29daysAgo', 'GA4 30 ngày'),
      bounded(client.runRealtimeReport({ property, metrics: [{ name: 'activeUsers' }] }, { timeout: TIMEOUT_MS }), 'GA4 Realtime'),
      bounded(client.runReport({ property, dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }], dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 7 }, { timeout: TIMEOUT_MS }), 'GA4 theo ngày'),
      bounded(client.runReport({ property, dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }], dimensions: [{ name: 'sessionSourceMedium' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 }, { timeout: TIMEOUT_MS }), 'GA4 nguồn truy cập')
    ]);
    const summaryResult = result => {
      const row = result[0].rows?.[0];
      return { users: num(row, 0), views: num(row, 1), sessions: num(row, 2), newUsers: num(row, 3) };
    };
    const date = s => s?.length === 8 ? `${s.slice(6, 8)}/${s.slice(4, 6)}` : s;
    const reportRows = { today: Number(todayReport[0].rowCount || 0), week: Number(weekReport[0].rowCount || 0), month: Number(monthReport[0].rowCount || 0), daily: Number(daily[0].rowCount || 0), sources: Number(sources[0].rowCount || 0) };
    const diagnostic = {
      propertyId,
      reportRows,
      note: reportRows.month === 0 && num(realtime[0].rows?.[0], 0) > 0
        ? 'Realtime có người dùng nhưng báo cáo chuẩn chưa có hàng dữ liệu. Kiểm tra GA4 Property ID, khoảng thời gian, bộ lọc dữ liệu và độ trễ xử lý GA4 (có thể 24-48 giờ). Không suy ra lỗi giao diện.'
        : reportRows.month === 0
          ? 'GA4 trả về báo cáo 30 ngày không có hàng dữ liệu. Kiểm tra Property ID, thời gian và luồng đo lường.'
          : null
    };
    // GA4 standard reports can lag behind realtime. Persist the largest
    // observed daily standard-report count and a separately labeled realtime
    // peak. A realtime peak is NOT a count of distinct users for the day.
    const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const todayOfficial = summaryResult(todayReport);
    const realtimeNow = num(realtime[0].rows?.[0], 0);
    const snapshotRef = a.database().ref('analyticsDailySnapshots/' + dayKey);
    let todayDisplay = { ...todayOfficial };
    let todayEstimate = false;
    let snapshotWarning = null;
    try {
      const snapshot = await bounded(snapshotRef.transaction(current => {
        const previous = current && typeof current === 'object' ? current : {};
        return {
          users: Math.max(Number(previous.users) || 0, todayOfficial.users),
          views: Math.max(Number(previous.views) || 0, todayOfficial.views),
          sessions: Math.max(Number(previous.sessions) || 0, todayOfficial.sessions),
          newUsers: Math.max(Number(previous.newUsers) || 0, todayOfficial.newUsers),
          realtimePeak: Math.max(Number(previous.realtimePeak) || 0, realtimeNow),
          updatedAt: new Date().toISOString()
        };
      }), 'Lưu thống kê ngày');
      const saved = snapshot.snapshot.val() || {};
      todayDisplay = {
        users: Number(saved.users) || 0,
        views: Number(saved.views) || 0,
        sessions: Number(saved.sessions) || 0,
        newUsers: Number(saved.newUsers) || 0
      };
      if (todayDisplay.users === 0 && Number(saved.realtimePeak) > 0) {
        todayDisplay.users = Number(saved.realtimePeak);
        todayEstimate = true;
      }
    } catch (snapshotError) {
      console.error('Analytics daily snapshot:', snapshotError.message);
      snapshotWarning = 'Không lưu được số liệu ngày vào Firebase. Kiểm tra quyền ghi analyticsDailySnapshots.';
      if (todayDisplay.users === 0 && realtimeNow > 0) {
        todayDisplay.users = realtimeNow;
        todayEstimate = true;
      }
    }
    diagnostic.todayEstimate = todayEstimate;
    diagnostic.snapshotWarning = snapshotWarning;
    diagnostic.dayKey = dayKey;
    return res.status(200).json({
      diagnostic,
      today: todayDisplay,
      week: summaryResult(weekReport),
      month: summaryResult(monthReport),
      realtime: { users: num(realtime[0].rows?.[0], 0) },
      daily: (daily[0].rows || []).map(r => ({ date: date(r.dimensionValues?.[0]?.value), users: num(r, 0) })),
      sources: (sources[0].rows || []).map(r => ({ source: r.dimensionValues?.[0]?.value || 'Không xác định', sessions: num(r, 0) }))
    });
  } catch (err) {
    console.error('Analytics API:', { message: err.message, code: err.code });
    const message = String(err.message || 'Không lấy được dữ liệu');
    const permission = err.code === 7 || /permission|PERMISSION_DENIED/i.test(message);
    return res.status(permission ? 403 : /không phản hồi|DEADLINE_EXCEEDED/i.test(message) ? 504 : 500).json({ error: permission ? 'Không đủ quyền Firebase hoặc Google Analytics. Kiểm tra Service Account và quyền GA4 Viewer.' : message });
  }
};
