
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

    #xoaipFreeMap {
      width: 100%;
      height: 300px;
      border-radius: 10px;
      overflow: hidden;
      background: #10283c;
      position: relative;
      z-index: 1;
    }

    #xoaipFreeMap[hidden] {
      display: none !important;
    }

    #homeGeoMap .maplibregl-popup-content {
      color: #142536;
      border-radius: 10px;
      padding: 14px;
      font-size: 12px;
    }

    #homeGeoMap .maplibregl-popup-close-button {
      color: #142536;
    }

    #homeGeoMap .maplibregl-ctrl-attrib {
      font-size: 10px;
    }

    #homeGeoMap .maplibregl-ctrl-attrib a {
      color: #333;
    }

    @media (max-width: 600px) {
      #xoaipFreeMap {
        height: 230px;
      }

      #homeGeoMap {
        padding: 9px;
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

    if (oldMap) {
      oldMap.style.display = 'none';
    }

    const panel = document.createElement('section');

    panel.id = 'homeGeoMap';
    panel.className = 'v84-map';

    panel.innerHTML = `
      <h3>📍 VỊ TRÍ IP THAM KHẢO</h3>

      <p id="geoLocation" role="status">
        Chọn và lưu IP để xem vị trí.
      </p>

      <div id="xoaipFreeMap" hidden></div>

      <p id="geoCoords"></p>

      <p style="font-size:10px;color:#8aafc7">
        MaxMind GeoLite2 · Vị trí ước tính
        · Không thay đổi IP mạng thật.
      </p>
    `;

    home.appendChild(panel);

    const label = document.getElementById('geoLocation');
    const coords = document.getElementById('geoCoords');
    const mapBox = document.getElementById('xoaipFreeMap');

    let map;
    let marker;
    let popup;
    let seq = 0;
    let loader;
    let timer;

    const cache = new Map();

    function loadMapLibre() {
      if (loader) return loader;

      loader = new Promise((resolve, reject) => {
        const css = document.createElement('link');

        css.rel = 'stylesheet';
        css.href =
          'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';

        const script = document.createElement('script');

        script.src =
          'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';

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

    function scheduleUpdate() {
      clearTimeout(timer);
      timer = setTimeout(update, 250);
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

      label.textContent =
        'Đang tải dữ liệu vị trí...';

      try {
        if (!cache.has(saved.country)) {
          const res = await fetch(
            'v84-map/' + saved.country + '.json'
          );

          if (!res.ok) {
            throw new Error('DATA');
          }

          cache.set(
            saved.country,
            await res.json()
          );
        }

        if (n !== seq) return;

        const point =
          cache.get(saved.country)[saved.ip];

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
          saved.ip + ' · Khu vực đã chọn: ' +
          location;

        const coordinateText =
          'Tọa độ ước tính: ' +
          lat.toFixed(4) + ', ' +
          lon.toFixed(4);

        coords.textContent = coordinateText;

        await loadMapLibre();

        if (n !== seq) return;

        mapBox.hidden = false;

        if (!map) {
          map = new maplibregl.Map({
            container: mapBox,

            style:
              'https://tiles.openfreemap.org/styles/liberty',

            center: [lon, lat],

            zoom: 11,

            minZoom: 2,

            maxZoom: 18,

            scrollZoom: false,

            attributionControl: true
          });

          map.addControl(
            new maplibregl.NavigationControl(),
            'top-right'
          );

          map.on('error', event => {
            console.error(
              'OPENFREEMAP:',
              event.error
            );

            coords.textContent =
              'Một phần dữ liệu bản đồ chưa tải được.';
          });

          map.on('idle', () => {
            if (!mapBox.hidden && map.areTilesLoaded()) {
              const center = map.getCenter();

              coords.textContent =
                mapBox.dataset.coordinates || '';
            }
          });
        }

        mapBox.dataset.coordinates = coordinateText;

        map.resize();

        map.jumpTo({
          center: [lon, lat],
          zoom: 11
        });

        if (marker) marker.remove();
        if (popup) popup.remove();

        const content = document.createElement('div');

        const title = document.createElement('strong');
        title.textContent = location;

        content.appendChild(title);

        content.appendChild(
          document.createElement('br')
        );

        content.appendChild(
          document.createTextNode(
            'IP tham khảo: ' + saved.ip
          )
        );

        popup = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false
        }).setDOMContent(content);

        marker = new maplibregl.Marker({
          color: '#ff304f'
        })
          .setLngLat([lon, lat])
          .setPopup(popup)
          .addTo(map);

        marker.togglePopup();

        requestAnimationFrame(() => {
          map.resize();
        });

      } catch (error) {
        if (n !== seq) return;

        mapBox.hidden = true;

        if (error.message === 'COORDINATES') {
          label.textContent =
            'Không có tọa độ cho IP đã chọn.';
        } else if (error.message === 'DATA') {
          label.textContent =
            'Không tải được dữ liệu vị trí IP.';
        } else {
          coords.textContent +=
            ' · Bản đồ tạm thời không tải được.';
        }

        console.error('XOAIP MAP:', error);
      }
    }

    apply.addEventListener(
      'click',
      scheduleUpdate
    );

    new MutationObserver(scheduleUpdate).observe(ip, {
      childList: true,
      characterData: true,
      subtree: true
    });

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }
})();
