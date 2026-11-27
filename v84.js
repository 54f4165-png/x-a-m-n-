const hideStatusPanel = document.createElement('style');
hideStatusPanel.textContent = `
    .v84-status {
        display: none !important;
    }
`;
document.head.appendChild(hideStatusPanel);
;(() => {
  const home = document.querySelector('.home-info');
  const ip = document.getElementById('homeIp');
  const apply = document.getElementById('apply');

  if (!home || !ip || !apply ||
      document.getElementById('homeGeoMap')) return;

  const notes = home.querySelectorAll('.home-info-note');

  if (notes[0]) notes[0].style.fontSize = '11px';
  if (notes[1]) notes[1].textContent =
    'Vị trí IP tham khảo, không thay đổi IP mạng thật.';

  const panel = document.createElement('section');
  panel.id = 'homeGeoMap';
  panel.className = 'v84-map';

  panel.innerHTML = `
    <h3>📍 VỊ TRÍ IP THAM KHẢO</h3>
    <p role="status">Chọn và lưu IP để xem bản đồ.</p>
    <iframe
      title="Bản đồ vị trí IP tham khảo"
      loading="lazy"
      referrerpolicy="no-referrer"
      style="display:none;width:100%;height:210px;border:0;border-radius:9px">
    </iframe>
    <p>GeoLite2 · Vị trí ước tính · OpenStreetMap</p>
  `;

  home.append(panel);

  const label = panel.querySelector('p');
  const frame = panel.querySelector('iframe');
  const oldMap = document.querySelector(
    '.v84-map:not(#homeGeoMap)'
  );

  if (oldMap) oldMap.hidden = true;

  const cache = new Map();
  let seq = 0;

  async function update() {
    const n = ++seq;
    frame.style.display = 'none';
    frame.removeAttribute('src');

    let saved;

    try {
      saved = JSON.parse(localStorage.getItem(
        'xoaip_v78_display_profile_v1'
      ) || 'null');
    } catch {}

    if (!saved || saved.ip !== ip.textContent.trim() ||
        !/^[A-Z]{2}$/.test(saved.country)) {
      label.textContent = 'Chọn và lưu IP để xem bản đồ.';
      return;
    }

    label.textContent = 'Đang tải vị trí IP tham khảo...';

    try {
      if (!cache.has(saved.country)) {
        const res = await fetch(
          'v84-map/' + saved.country + '.json'
        );

        if (!res.ok) throw Error();

        cache.set(saved.country, await res.json());
      }

      if (n !== seq) return;

      const point = cache.get(saved.country)[saved.ip];

      if (!Array.isArray(point) ||
          !point.every(Number.isFinite) ||
          Math.abs(point[0]) > 90 ||
          Math.abs(point[1]) > 180) throw Error();

      const [lat, lon] = point;

      const country = new Intl.DisplayNames(
        ['vi'], {type:'region'}
      ).of(saved.country);

      label.textContent = saved.ip +
        ' · Khu vực đã chọn: ' +
        saved.province + ', ' + country;

      const bbox = [
        Math.max(-180, lon - .35),
        Math.max(-85, lat - .22),
        Math.min(180, lon + .35),
        Math.min(85, lat + .22)
      ];

      if (bbox[1] >= bbox[3]) throw Error();

      frame.src =
        'https://www.openstreetmap.org/export/embed.html?' +
        new URLSearchParams({
          bbox: bbox.join(','),
          layer: 'mapnik',
          marker: lat + ',' + lon
        });

      frame.style.display = 'block';

    } catch {
      if (n === seq) label.textContent =
        'Không có tọa độ bản đồ cho IP đã chọn.';
    }
  }

  apply.addEventListener('click', update);
  update();
})();
