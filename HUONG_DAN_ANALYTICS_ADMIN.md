# Hướng dẫn bật thống kê Google Analytics 4 trong XOAIP ADMIN

Bản cập nhật giữ nguyên `index.html` cũ và Firebase. Bảng mới chỉ hiện sau khi đăng nhập, API kiểm tra UID trong `adminUids` trước khi trả số liệu.

## 1. Triển khai

Giải nén ZIP rồi đưa các tệp lên repository ADMIN đang triển khai bằng Vercel, bao gồm `api/analytics.js` và `package.json`. Chọn Framework Preset: Other và thư mục gốc dự án. Nếu có cấu hình Vercel đặc biệt, cần đảm bảo `/api/analytics` được triển khai như Vercel Function và trang tĩnh vẫn chạy bình thường.

## 2. Google Analytics

Mở Google Analytics > Quản trị > Thông tin chi tiết về tài sản, sao chép **Property ID** dạng số (KHÔNG phải mã đo lường G-976BL2Q3J5). Tại Google Cloud Console, bật **Google Analytics Data API** trong dự án Google Cloud của bạn. Tạo service account, cấp quyền xem (Viewer) cho email service account tại Google Analytics > Quản trị > Quản lý quyền truy cập tài sản.

## 3. Vercel Environment Variables

Tại dự án ADMIN trong Vercel > Settings > Environment Variables, thêm:

- `GA4_PROPERTY_ID` = Property ID dạng số.
- `GOOGLE_SERVICE_ACCOUNT_JSON` = nội dung JSON credentials của service account, giữ nguyên định dạng JSON (chứa private_key).

**Không** đưa JSON khóa bí mật lên GitHub, không đặt trong HTML, không gửi qua chat. Thiết lập biến môi trường ở Vercel, rồi Redeploy. Nếu môi trường không hỗ trợ JSON nhiều dòng, dùng chuỗi JSON đã escape hợp lệ. Giữ bí mật và xoay khóa nếu bị lộ.

## 4. Kiểm tra

Đăng nhập ADMIN được cấp quyền trong Firebase `adminUids`. Nhấn CẬP NHẬT SỐ LIỆU. Nếu báo lỗi, xem Vercel Function Logs và kiểm tra Google Analytics Property ID, Data API, quyền Viewer và biến môi trường. Dữ liệu GA4 có thể trễ; chỉ số theo khoảng ngày có thể trùng người dùng. API sử dụng Firebase ID token để xác thực, không công khai báo cáo cho khách chưa đăng nhập.

**Lưu ý:** Mã đo lường `G-976BL2Q3J5` vẫn nằm ở website USER. ADMIN chỉ đọc dữ liệu qua API, không gắn mã đo lường để tránh tính lượt truy cập ADMIN vào số liệu USER.


## 5. Sửa lỗi FirebaseAuthError (bản cập nhật 06/11/2026)

API đã thay `verifyIdToken(token, true)` bằng `verifyIdToken(token)`. Cách này vẫn xác thực chữ ký, issuer, audience và thời hạn Firebase ID token, nhưng không thực hiện truy vấn kiểm tra token bị thu hồi (vốn có thể đòi thêm quyền Firebase Authentication). Vì vậy, token đã bị thu hồi vẫn có thể được chấp nhận cho tới khi hết hạn. Nếu cần kiểm tra thu hồi, cấp đúng quyền Firebase Authentication cho service account thay vì dùng cách này.

API tiếp tục đọc `adminUids/<uid>` qua Firebase Realtime Database để kiểm tra quyền ADMIN. Nếu vẫn lỗi 403, kiểm tra quyền IAM của service account đối với Firebase Realtime Database và quyền Viewer trong GA4. Chỉ cấp quyền tối thiểu cần thiết.

**Bảo mật:** Ảnh chụp trước đây có hiển thị nội dung khóa riêng của service account. Hãy thu hồi/xóa khóa đó trên Google Cloud, tạo khóa mới và cập nhật `GOOGLE_SERVICE_ACCOUNT_JSON` trên Vercel, rồi Redeploy. Không đăng khóa mới lên GitHub hoặc gửi trong chat.
