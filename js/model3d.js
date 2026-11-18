/* Сечение изделия и 3D-модель отрезка на canvas, без библиотек.
   Контуры строятся по настоящим размерам из каталога (мм), со скруглениями, как у прессованного профиля. */
(function () {
  var PO = window.PO;

  function circle(cx, cy, r, n, rev) {
    var pts = [];
    for (var i = 0; i < n; i++) { var a = (rev ? -1 : 1) * i / n * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  function arc(cx, cy, r, a0, a1, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  }
  function rrect(x, y, w, h, r, rev) {
    r = Math.min(r, w / 2, h / 2);
    var P = Math.PI, p;
    if (r <= 0.01) p = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    else p = [].concat(arc(x + w - r, y + r, r, -P / 2, 0, 5), arc(x + w - r, y + h - r, r, 0, P / 2, 5), arc(x + r, y + h - r, r, P / 2, P, 5), arc(x + r, y + r, r, P, P * 1.5, 5));
    return rev ? p.reverse() : p;
  }

  /* Контуры сечения в мм, ось Y вверх, центр в (0,0) */
  function shape(p) {
    var d = p.dims, c = [], w, h, P = Math.PI, s = d.s, r;
    switch (p.cat) {
      case 'ugolok':
        w = h = d.a; r = s; // внутреннее скругление между полками
        c.push([[0, 0], [d.a, 0], [d.a, s]].concat(arc(s + r, s + r, r, -P / 2, -P, 6)).concat([[s, d.a], [0, d.a]]));
        break;
      case 'shveller':
        w = d.b; h = d.a; r = s * 0.8;
        c.push([[0, 0], [d.b, 0], [d.b, s]].concat(arc(s + r, s + r, r, -P / 2, -P, 5), arc(s + r, d.a - s - r, r, P, P / 2, 5)).concat([[d.b, d.a - s], [d.b, d.a], [0, d.a]]));
        break;
      case 'polosa': w = d.a; h = s; c.push(rrect(0, 0, d.a, s, s * 0.25)); break;
      case 'list': w = 160; h = s; c.push(rrect(0, 0, 160, s, 0)); break;
      case 'profil': w = d.b; h = d.a; c.push(rrect(0, 0, d.b, d.a, s * 1.2)); c.push(rrect(s, s, d.b - 2 * s, d.a - 2 * s, s * 0.3, true)); break;
      case 'truba': w = h = d.d; c.push(circle(d.d / 2, d.d / 2, d.d / 2, 64)); c.push(circle(d.d / 2, d.d / 2, d.d / 2 - s, 64, true)); break;
      default: w = h = d.d; c.push(circle(d.d / 2, d.d / 2, d.d / 2, 64));
    }
    c = c.map(function (pts) { return pts.map(function (q) { return [q[0] - w / 2, q[1] - h / 2]; }); });
    return { contours: c, w: w, h: h };
  }

  /* Чертёж сечения с размерами (SVG) */
  function drawing(p) {
    var s = shape(p), W = 300, H = 260, pad = 46;
    var k = Math.min((W - pad * 2) / s.w, (H - pad * 2) / s.h);
    var ox = W / 2, oy = H / 2;
    var X = function (x) { return (ox + x * k).toFixed(1); }, Y = function (y) { return (oy - y * k).toFixed(1); };
    var path = s.contours.map(function (pts) { return 'M' + pts.map(function (q) { return X(q[0]) + ' ' + Y(q[1]); }).join('L') + 'Z'; }).join('');
    var g = '', l = -s.w / 2, r = s.w / 2, b = -s.h / 2, t = s.h / 2, d = p.dims, n = PO.num;
    var dimH = function (x1, x2, y, txt) { return '<path d="M' + X(x1) + ' ' + y + 'H' + X(x2) + '" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="' + ((+X(x1) + +X(x2)) / 2) + '" y="' + (y + 16) + '" text-anchor="middle">' + txt + '</text>'; };
    var dimV = function (y1, y2, x, txt) { return '<path d="M' + x + ' ' + Y(y1) + 'V' + Y(y2) + '" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="' + (x - 8) + '" y="' + ((+Y(y1) + +Y(y2)) / 2 + 4) + '" text-anchor="end">' + txt + '</text>'; };
    if (p.cat === 'truba' || p.cat === 'prutok' || p.cat === 'cvet') {
      g += '<path d="M' + X(l) + ' ' + Y(0) + 'H' + X(r) + '" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="' + X(0) + '" y="' + (+Y(0) - 8) + '" text-anchor="middle" class="on">Ø' + n(d.d) + '</text>';
      if (p.cat === 'truba') g += '<text x="' + (+X(r) + 8) + '" y="' + (+Y(t) + 4) + '">s = ' + n(d.s) + '</text>';
    } else {
      var yb = +Y(b) + 20, xl = +X(l) - 16;
      g += dimH(l, r, yb, p.cat === 'list' ? 'фрагмент' : n(s.w));
      if (p.cat !== 'list') g += dimV(b, t, xl, n(s.h));
      g += '<text x="' + (+X(r) + 8) + '" y="' + (+Y(t) + 12) + '">' + (p.cat === 'list' || p.cat === 'polosa' ? 't = ' : 's = ') + n(d.s) + '</text>';
    }
    return '<svg class="draw" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Чертёж сечения ' + p.size + ' мм">' +
      '<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 1L10 5L0 9" fill="none" stroke="#64645F" stroke-width="1.4"/></marker></defs>' +
      '<path d="' + path + '" fill="#D9D9D5" fill-rule="evenodd" stroke="#111" stroke-width="1.6"/>' +
      '<g fill="none" stroke="#64645F" stroke-width="1" font-family="Commissioner, sans-serif" font-size="13">' + g.replace(/<text/g, '<text fill="#3A3A34" stroke="none"') + '</g></svg>';
  }

  /* Металл: основной цвет, цвет блика, отражение тёмного «пола» */
  var METAL = {
    'Алюминий': { base: [184, 189, 195], spec: [255, 255, 255], floor: [78, 82, 88] },
    'Медь': { base: [196, 108, 66], spec: [255, 218, 190], floor: [86, 40, 22] },
    'Латунь': { base: [200, 164, 80], spec: [255, 242, 200], floor: [92, 70, 26] },
    'Бронза': { base: [164, 114, 66], spec: [248, 216, 172], floor: [74, 48, 24] }
  };

  /* Текстура торца: следы пилы */
  var noise = null;
  function noisePattern(ctx) {
    if (noise) return noise;
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var x = c.getContext('2d'), img = x.createImageData(96, 96);
    for (var i = 0; i < img.data.length; i += 4) {
      var row = Math.floor(i / 4 / 96), v = 128 + (Math.random() - 0.5) * 80 + Math.sin(row * 0.9) * 22;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 50;
    }
    x.putImageData(img, 0, 0); noise = ctx.createPattern(c, 'repeat'); return noise;
  }

  function Model(canvas, p) {
    var s = shape(p), ctx = canvas.getContext('2d');
    var R = Math.max(s.w, s.h), L = p.cat === 'list' ? 260 : Math.max(R * 2.4, 60);
    var m = METAL[p.metal] || METAL['Алюминий'], anod = p.coat === 'анодированный';
    var yaw = -0.7, pitch = -0.38, auto = !matchMedia('(prefers-reduced-motion: reduce)').matches, drag = null, raf = 0;

    var quads = [];
    s.contours.forEach(function (pts) {
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        quads.push([[a[0], a[1], -L / 2], [b[0], b[1], -L / 2], [b[0], b[1], L / 2], [a[0], a[1], L / 2]]);
      }
    });

    function rot(v) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy, y = v[1];
      return [x, y * cp - z * sp, y * sp + z * cp];
    }
    function nrm(a, b, c) {
      var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      var n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      var k = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / k, n[1] / k, n[2] / k];
    }
    // Камера смотрит вдоль +z. Направление на лампу: сверху слева, со стороны зрителя.
    var KEY = (function () { var v = [-0.5, 0.75, -0.45], k = Math.hypot(v[0], v[1], v[2]); return [v[0] / k, v[1] / k, v[2] / k]; })();

    /* «Студийный» свет: светлое небо сверху, тёмный пол снизу, резкий блик лампы */
    function light(n, gain) {
      if (n[2] > 0) n = [-n[0], -n[1], -n[2]];             // грань повёрнута к зрителю
      var up = (n[1] + 1) / 2;
      var dif = Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]);
      var rx = -2 * n[2] * n[0], ry = -2 * n[2] * n[1], rz = 1 - 2 * n[2] * n[2]; // отражённый луч взгляда
      var sp = Math.pow(Math.max(0, -(rx * KEY[0] + ry * KEY[1] + rz * KEY[2])), anod ? 10 : 26) * (anod ? 0.3 : 0.8);
      var rim = Math.pow(1 - Math.abs(n[2]), 3) * 0.2;
      var out = [];
      for (var i = 0; i < 3; i++) {
        var env = m.floor[i] + (m.base[i] - m.floor[i]) * (0.3 + 0.85 * up);
        out.push(Math.max(0, Math.min(255, Math.round(env * (0.6 + 0.48 * dif) * (gain || 1) + m.spec[i] * (sp + rim)))));
      }
      return out;
    }
    function rgb(c, k) { return 'rgb(' + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * (k || 1)))); }).join(',') + ')'; }

    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var ext = Math.hypot(R, L) * 0.62, dist = ext * 8, f = Math.min(W, H) * 0.5 / ext * 1.35;
      var proj = function (v) { var k = f * dist / (v[2] + dist); return [W / 2 + v[0] * k, H / 2 - v[1] * k]; };

      var faces = [], minX = 1e9, maxX = -1e9, maxY = -1e9;
      quads.forEach(function (q) {
        var r = q.map(rot), n = nrm(r[0], r[1], r[2]), P = r.map(proj);
        P.forEach(function (pt) { minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]); });
        var cz = (r[0][2] + r[1][2] + r[2][2] + r[3][2]) / 4;
        // грань смотрит от камеры — её не видно, не рисуем (иначе тонкий лист «просвечивает»)
        if (n[0] * (r[0][0] + r[2][0]) / 2 + n[1] * (r[0][1] + r[2][1]) / 2 + n[2] * (cz + dist) > 0) return;
        faces.push({ pts: P, z: cz, c: light(n) });
      });
      [-1, 1].forEach(function (side) {
        var z0 = side * L / 2, polys = s.contours.map(function (pts) { return pts.map(function (q) { return proj(rot([q[0], q[1], z0])); }); });
        var cn = rot([0, 0, side]), cc = rot([0, 0, z0]);
        if (cn[0] * cc[0] + cn[1] * cc[1] + cn[2] * (cc[2] + dist) > 0) return;
        faces.push({ cap: polys, z: cc[2], c: light(cn, 0.9) });
      });
      faces.sort(function (a, b) { return b.z - a.z; }); // сначала дальние

      // мягкая тень под отрезком
      var rw = (maxX - minX) * 0.55;
      ctx.save(); ctx.translate(W / 2, maxY + 12); ctx.scale(1, 0.16);
      var sh = ctx.createRadialGradient(0, 0, 2, 0, 0, rw);
      sh.addColorStop(0, 'rgba(0,0,0,.26)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      faces.forEach(function (fc) {
        ctx.beginPath();
        if (fc.cap) {
          fc.cap.forEach(function (poly) { poly.forEach(function (pt, i) { i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); }); ctx.closePath(); });
          ctx.fillStyle = rgb(fc.c); ctx.fill('evenodd');
          ctx.save(); ctx.clip('evenodd'); ctx.fillStyle = noisePattern(ctx); ctx.fillRect(0, 0, W, H); ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
        } else {
          var P = fc.pts;
          P.forEach(function (pt, i) { i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); }); ctx.closePath();
          // свет плавно меняется вдоль отрезка — металл не выглядит плоской заливкой
          var g = ctx.createLinearGradient(P[0][0], P[0][1], P[3][0], P[3][1]);
          g.addColorStop(0, rgb(fc.c, 0.84)); g.addColorStop(0.5, rgb(fc.c, 1.07)); g.addColorStop(1, rgb(fc.c, 0.92));
          ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = g; ctx.lineWidth = 0.8; ctx.stroke();
        }
      });
    }

    function loop() { if (auto && !drag) yaw += 0.005; draw(); raf = requestAnimationFrame(loop); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch }; canvas.setPointerCapture(e.pointerId); auto = false; });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
      pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.01));
      if (!raf) draw();
    });
    function up() { drag = null; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
      if (!k) return; e.preventDefault(); auto = false; yaw += k[0]; pitch = Math.max(-1.2, Math.min(1.2, pitch + k[1])); if (!raf) draw();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) { if (!raf) loop(); } else stop(); }).observe(canvas);
    } else loop();
    window.addEventListener('resize', function () { if (!raf) draw(); });
    draw();
    return { draw: draw };
  }

  PO.shape = shape;
  PO.drawing = drawing;
  PO.Model = Model;
})();
