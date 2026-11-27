;(() => {
  const style = document.createElement('style');

  style.textContent = `
    .v84-status {
      display: none !important;
    }

    #homeGeoMap {
      margin-top: 12px;
      padding: 12px;
      background: #091d30;
      border: 1px solid #24668e;
      border-radius: 12px;
    }

    #homeGeoMap h3 {
      color: #65dfff;
      font-size: 14px;
      margin: 0 0 10px;
    }

    #homeGeoMap p {
      font-size: 12px;
      line-height: 1.5;
      margin: 8px 0;
    }

    #xoaipLeafletMap {
      width: 100%;
      height: 280px;
      border-radius: 9px;
      overflow: hidden;
      background: #10283c;
      z-index: 1;
    }

    @media (max-width: 600px) {
      #xoaipLeafletMap {
        height: 220px;
      }
    }
  `;

  document.head.appendChild(style);

  function init() {
    const home = document.querySelector('.home-info');
    const ip = document.getElementById('homeIp');
    const apply = document.getElementById('apply');

    if (!home || !ip || !apply) return;
    if (document.getElementById('homeGeoMap')) return;

    const notes = home.querySelectorAll('.home-info-note');

    if (notes[0]) {
      notes[0].style.fontSize = '10px';
    }

    if (notes[1]) {
      notes[1].style.display = 'none';
    }

    const oldMap = document.querySelector('.v84-map');
    if (oldMap) oldMap.style.display = 'none';

    const panel = document.createElement('section');
    panel.id = 'homeGeoMap';
    panel.className = 'v84-map';

    panel.innerHTML = `
      <h3>📍 VỊ TRÍ IP THAM KHẢO</h3>
      <p id="geoLocation" role="status">
        Chọn và lưu IP để xem vị trí.
      </p>
      <div id="xoaipLeafletMap" hidden></div>
      <p id="geoCoords"></p>
      <p style="font-size:10px;color:#8aafc7">
        MaxMind GeoLite2 · Vị trí ước tính
        · Không thay đổi IP mạng thật.
      </p>
    `;

    home.appendChild(panel);

    const label = document.getElementById('geoLocation');
    const coords = document.getElementById('geoCoords');
    const mapBox = document.getElementById('xoaipLeafletMap');

    let map;
    let marker;
    let seq = 0;
    let loader;
    const cache = new Map();

    function loadLeaflet() {
      if (loader) return loader;

      loader = new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

        css.integrity =
          'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';

        css.crossOrigin = 'anonymous';

        const script = document.createElement('script');

        script.src =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

        script.integrity =
          'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

        script.crossOrigin = 'anonymous';

        Promise.all([
          new Promise((ok, fail) => {
            css.onload = ok;
            css.onerror = fail;
          }),
          new Promise((ok, fail) => {
            script.onload = ok;
            script.onerror = fail;
          })
        ]).then(resolve, reject);

        document.head.appendChild(css);
        document.head.appendChild(script);
      }).catch(error => {
        loader = null;
        throw error;
      });

      return loader;
    }

    async function update() {
      const n = ++seq;

      mapBox.hidden = true;
      coords.textContent = '';

      let saved;

      try {
        saved = JSON.parse(
          localStorage.getItem(
            'xoaip_v78_display_profile_v1'
          ) || 'null'
        );
      } catch {}

      if (
        !saved ||
        saved.ip !== ip.textContent.trim() ||
        !/^[A-Z]{2}$/.test(saved.country)
      ) {
        label.textContent =
          'Chọn và lưu IP để xem vị trí.';
        return;
      }

      label.textContent = 'Đang tải dữ liệu vị trí...';

      try {
        if (!cache.has(saved.country)) {
          const res = await fetch(
            'v84-map/' + saved.country + '.json'
          );

          if (!res.ok) throw new Error('DATA');

          cache.set(saved.country, await res.json());
        }

        if (n !== seq) return;

        const point = cache.get(saved.country)[saved.ip];

        if (
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(Number.isFinite) ||
          Math.abs(point[0]) > 85 ||
          Math.abs(point[1]) > 180
        ) {
          throw new Error('COORDINATES');
        }

        const [lat, lon] = point;

        const country = new Intl.DisplayNames(
          ['vi'], { type: 'region' }
        ).of(saved.country);

        const location =
          saved.province + ', ' + country;

        label.textContent =
          saved.ip + ' · Khu vực đã chọn: ' + location;

        coords.textContent =
          'Tọa độ ước tính: ' +
          lat.toFixed(4) + ', ' + lon.toFixed(4);

        await loadLeaflet();

        if (n !== seq) return;

        mapBox.hidden = false;

        if (!map) {
          map = L.map(mapBox, {
            zoomControl: true,
            scrollWheelZoom: false
          });

         const tiles = L.tileLayer(
  'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }
);

          tiles.on('tileerror', () => {
            coords.textContent =
              'Không tải được ảnh bản đồ. Tọa độ: ' +
              lat.toFixed(4) + ', ' + lon.toFixed(4);
          });

          tiles.addTo(map);
        }

        map.setView([lat, lon], 11);

        if (marker) map.removeLayer(marker);

        marker = L.circleMarker([lat, lon], {
          radius: 9,
          color: '#ffffff',
          weight: 3,
          fillColor: '#ff304f',
          fillOpacity: 1
        }).addTo(map);

        const popup = document.createElement('div');

        const name = document.createElement('strong');
        name.textContent = location;

        popup.appendChild(name);
        popup.appendChild(document.createElement('br'));
        popup.appendChild(
          document.createTextNode(
            'IP tham khảo: ' + saved.ip
          )
        );

        marker.bindPopup(popup).openPopup();

        requestAnimationFrame(() => {
          map.invalidateSize();
        });

      } catch (error) {
        if (n !== seq) return;

        mapBox.hidden = true;

        label.textContent =
          'Không thể tải bản đồ IP tham khảo.';

        console.error('XOAIP MAP:', error);
      }
    }

    apply.addEventListener('click', () => {
      setTimeout(update, 150);
    });

    new MutationObserver(update).observe(ip, {
      childList: true,
      characterData: true,
      subtree: true
    });

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
