/* ORBYTE — orbyte.js (aucune dépendance) */
(() => {
  'use strict';
  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => mq.matches || html.classList.contains('reduce-motion');
  const nf = (n, d = 0) => new Intl.NumberFormat(html.lang || 'fr', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
  const announce = (m) => { const l = $('#LiveRegion'); if (!l) return; l.textContent = ''; setTimeout(() => { l.textContent = m; }, 50); };
  const loops = new Set();   // animations en cours (pour pause globale)

  /* =========================================================
     Bruit (value noise 3D, déterministe par graine)
     ========================================================= */
  const makeNoise = (seed) => {
    const perm = new Uint8Array(512);
    let s = seed >>> 0 || 1;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const vals = new Float32Array(256).map(() => rnd());
    const fade = (t) => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    const h = (x, y, z) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];
    const noise = (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
      const x1 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), xf);
      const x2 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf);
      const x3 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf);
      const x4 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf);
      return lerp(lerp(x1, x2, yf), lerp(x3, x4, yf), zf);
    };
    return (x, y, z, oct = 5) => { let a = 1, f = 1, sum = 0, n = 0; for (let o = 0; o < oct; o++) { sum += noise(x * f, y * f, z * f) * a; n += a; a *= 0.5; f *= 2.03; } return sum / n; };
  };
  const hex = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(c || '#888888'); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [136, 136, 136]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

  /* =========================================================
     Planète procédurale (texture générée + sphère éclairée)
     ========================================================= */
  const textureCache = new Map();
  const buildTexture = (o) => {
    const key = [o.kind, o.c1, o.c2, o.c3, o.seed].join('|');
    if (textureCache.has(key)) return textureCache.get(key);
    const W = 512, H = 256, tex = new Uint8ClampedArray(W * H * 3);
    const fbm = makeNoise(o.seed);
    const fbm2 = makeNoise(o.seed * 7 + 3);
    const c1 = hex(o.c1), c2 = hex(o.c2), c3 = hex(o.c3);
    for (let y = 0; y < H; y++) {
      const lat = (y / (H - 1) - 0.5) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < W; x++) {
        const lon = (x / W) * Math.PI * 2;
        const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
        let col;
        switch (o.kind) {
          case 'gazeuse': {
            const turb = fbm(px * 2.2, py * 2.2, pz * 2.2, 4);
            const b = Math.sin(lat * 14 + turb * 5.5) * 0.5 + 0.5;
            const b2 = Math.sin(lat * 31 + turb * 3) * 0.5 + 0.5;
            col = mix(mix(c1, c2, b), c3, b2 * 0.35);
            if (o.spot) { const d = Math.hypot((lon - 4.2) * 1.3, (lat + 0.38) * 3.2); if (d < 0.5) col = mix(col, [196, 96, 64], smooth(0.5, 0.15, d) * 0.85); }
            break;
          }
          case 'glacee': {
            const turb = fbm(px * 1.5, py * 1.5, pz * 1.5, 3);
            const b = Math.sin(lat * 7 + turb * 1.6) * 0.5 + 0.5;
            col = mix(c1, c2, b * 0.55 + (py * 0.5 + 0.5) * 0.25);
            col = mix(col, c3, smooth(0.62, 0.8, turb) * 0.25);
            break;
          }
          case 'nuageuse': {
            const turb = fbm(px * 2.6 + 3, py * 2.6, pz * 2.6, 5);
            const swirl = Math.sin(lat * 5 + lon * 1.2 + turb * 6) * 0.5 + 0.5;
            col = mix(mix(c1, c2, swirl), c3, smooth(0.55, 0.75, turb) * 0.6);
            break;
          }
          case 'oceanique': {
            const n = fbm(px * 1.8, py * 1.8, pz * 1.8, 6);
            const land = smooth(0.5, 0.53, n);
            const ocean = mix(mix(c1, [5, 25, 70], 0.4), c1, smooth(0.3, 0.5, n));
            const ground = mix(c2, c3, smooth(0.55, 0.7, n));
            col = mix(ocean, ground, land);
            const ice = smooth(0.78, 0.9, Math.abs(py) + (n - 0.5) * 0.3);
            col = mix(col, [240, 246, 255], ice);
            const cloud = smooth(0.55, 0.72, fbm2(px * 3 + 9, py * 3, pz * 3, 5));
            col = mix(col, [250, 252, 255], cloud * 0.75);
            break;
          }
          default: { // rocheuse
            const n = fbm(px * 2.4, py * 2.4, pz * 2.4, 6);
            const d = fbm2(px * 9, py * 9, pz * 9, 3);
            col = mix(c2, c1, smooth(0.35, 0.7, n));
            col = mix(col, c3, smooth(0.62, 0.72, d) * 0.5);
            const crater = smooth(0.7, 0.74, fbm2(px * 16 + 4, py * 16, pz * 16, 2));
            col = mix(col, mix(col, [0, 0, 0], 0.35), crater);
            if (o.caps) col = mix(col, [245, 240, 235], smooth(0.86, 0.93, Math.abs(py) + (n - 0.5) * 0.2));
          }
        }
        const i = (y * W + x) * 3;
        tex[i] = col[0]; tex[i + 1] = col[1]; tex[i + 2] = col[2];
      }
    }
    const t = { W, H, data: tex };
    textureCache.set(key, t);
    return t;
  };

  class Planet {
    constructor(canvas) {
      this.canvas = canvas;
      const d = canvas.dataset;
      this.o = {
        kind: d.kind || 'rocheuse', c1: d.c1, c2: d.c2, c3: d.c3,
        seed: parseInt(d.seed || '7', 10), rings: d.rings === 'true', spot: d.spot === 'true', caps: d.caps === 'true',
        speed: parseFloat(d.speed || '1'), tilt: parseFloat(d.tilt || '0')
      };
      this.maxres = parseInt(d.maxres || '560', 10);
      this.hoverOnly = d.hover === 'true';
      this.hovered = false;
      if (this.hoverOnly) {
        const host = canvas.closest('[data-hover-host]') || canvas;
        host.addEventListener('pointerenter', () => { this.hovered = true; this.start(); });
        host.addEventListener('pointerleave', () => { this.hovered = false; });
        host.addEventListener('focusin', () => { this.hovered = true; this.start(); });
        host.addEventListener('focusout', () => { this.hovered = false; });
      }
      this.rot = parseFloat(d.start || '0');
      this.visible = false;
      this.ready = false;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.start(); }, { rootMargin: '100px' }).observe(canvas);
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.max(64, Math.min(this.maxres, Math.round(rect.width * dpr)));
      if (size === this.size) return;
      this.size = size;
      this.canvas.width = this.canvas.height = size;
      this.R = Math.floor(size * (this.o.rings ? 0.21 : 0.47));
      this.sphere = document.createElement('canvas');
      this.sphere.width = this.sphere.height = this.R * 2 + 2;
      this.sctx = this.sphere.getContext('2d');
      this.img = this.sctx.createImageData(this.sphere.width, this.sphere.height);
      this.precompute();
      this.draw();
    }
    precompute() {
      const R = this.R, D = this.sphere.width, n = D * D;
      this.lon0 = new Float32Array(n); this.latI = new Int32Array(n); this.shade = new Float32Array(n); this.alpha = new Float32Array(n);
      const L = [-0.55, -0.3, 0.78]; const ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
      for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
        const i = y * D + x;
        const nx = (x + 0.5 - D / 2) / R, ny = (y + 0.5 - D / 2) / R;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1.0) { this.alpha[i] = 0; continue; }
        const nz = Math.sqrt(1 - r2);
        this.alpha[i] = clamp((1 - Math.sqrt(r2)) * R * 1.2);
        this.lon0[i] = Math.atan2(nx, nz);
        this.latI[i] = Math.round((Math.asin(ny) / Math.PI + 0.5) * 255);
        const lambert = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        this.shade[i] = 0.07 + lambert * 1.05 + Math.pow(1 - nz, 3) * 0.25;
      }
    }
    draw() {
      if (!this.sphere) return;
      if (!this.tex) this.tex = buildTexture(this.o);
      const { W, data } = this.tex, D = this.sphere.width, out = this.img.data;
      const rot = this.rot;
      for (let i = 0, n = D * D; i < n; i++) {
        const a = this.alpha[i]; const j = i * 4;
        if (a === 0) { out[j + 3] = 0; continue; }
        let u = (this.lon0[i] + rot) / (Math.PI * 2); u -= Math.floor(u);
        const t = (this.latI[i] * W + ((u * W) | 0)) * 3;
        const s = this.shade[i];
        out[j] = data[t] * s; out[j + 1] = data[t + 1] * s; out[j + 2] = data[t + 2] * s; out[j + 3] = a * 255;
      }
      this.sctx.putImageData(this.img, 0, 0);
      const c = this.canvas.getContext('2d'), S = this.size, cx = S / 2, cy = S / 2;
      c.clearRect(0, 0, S, S);
      c.save(); c.translate(cx, cy); c.rotate(this.o.tilt * Math.PI / 180);
      if (this.o.rings) this.drawRings(c, 'back');
      c.drawImage(this.sphere, -this.sphere.width / 2, -this.sphere.height / 2);
      // atmosphère
      const g = c.createRadialGradient(0, 0, this.R * 0.9, 0, 0, this.R * 1.12);
      const [r, gg, b] = hex(this.o.c3 || this.o.c1);
      g.addColorStop(0, `rgba(${r},${gg},${b},0)`); g.addColorStop(0.5, `rgba(${r},${gg},${b},.18)`); g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, this.R * 1.12, 0, Math.PI * 2); c.fill();
      if (this.o.rings) this.drawRings(c, 'front');
      c.restore();
      this.ready = true;
    }
    drawRings(c, half) {
      const R = this.R, [r, g, b] = hex(this.o.c3 || '#d8c7a0');
      c.save();
      c.beginPath();
      if (half === 'back') c.rect(-this.size, -this.size, this.size * 2, this.size); else c.rect(-this.size, 0, this.size * 2, this.size);
      c.clip();
      for (let k = 0; k < 40; k++) {
        const t = k / 40, rr = R * (1.25 + t * 0.95);
        const gap = t > 0.55 && t < 0.6 ? 0.1 : 1;
        c.strokeStyle = `rgba(${r},${g},${b},${(0.12 + 0.35 * Math.sin(t * Math.PI)) * gap})`;
        c.lineWidth = R * 0.03;
        c.beginPath(); c.ellipse(0, 0, rr, rr * 0.26, 0, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    start() {
      if (!this.ready) this.draw();
      if (this.running || still() || (this.hoverOnly && !this.hovered)) return;
      this.running = true; loops.add(this);
      let last = performance.now();
      const tick = (now) => {
        if (!this.visible || still() || window.orbytePaused || (this.hoverOnly && !this.hovered)) { this.running = false; loops.delete(this); return; }
        const dt = now - last;
        if (dt >= 33) { /* ~30 images/s : fluide et économe */
          last = now;
          this.rot += Math.min(dt, 100) * 0.00012 * this.o.speed;
          this.draw();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
  const initPlanets = () => $$('canvas[data-planet]').forEach((c) => { if (!c._planet) c._planet = new Planet(c); });

  /* =========================================================
     Champ d'étoiles (3 couches, parallaxe, étoiles filantes)
     ========================================================= */
  const initStarfield = () => {
    const cv = $('[data-starfield]'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, stars = [], shoot = null, raf;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      const count = Math.min(420, Math.round((innerWidth * innerHeight) / 4200));
      stars = Array.from({ length: count }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1, tw: Math.random() * Math.PI * 2, hue: Math.random() < 0.15 ? 'violet' : (Math.random() < 0.2 ? 'amber' : 'white') }));
      paint(performance.now());
    };
    const colors = { white: '230,237,247', violet: '180,160,255', amber: '255,210,150' };
    const paint = (t) => {
      ctx.clearRect(0, 0, W, H);
      const sy = scrollY * (Math.min(devicePixelRatio || 1, 2));
      for (const s of stars) {
        const y = ((s.y - sy * s.z * 0.25) % H + H) % H;
        const a = still() ? 0.75 * s.z + 0.2 : (0.45 + 0.55 * Math.sin(t * 0.0015 * s.z + s.tw)) * s.z + 0.15;
        ctx.fillStyle = `rgba(${colors[s.hue]},${a.toFixed(3)})`;
        const r = s.z * 1.4;
        ctx.fillRect(s.x, y, r, r);
      }
      if (shoot) {
        const p = (t - shoot.t0) / 900;
        if (p > 1) shoot = null; else {
          const x = shoot.x + shoot.dx * p, y = shoot.y + shoot.dy * p;
          const g = ctx.createLinearGradient(x, y, x - shoot.dx * 0.25, y - shoot.dy * 0.25);
          g.addColorStop(0, `rgba(255,255,255,${1 - p})`); g.addColorStop(1, 'rgba(92,225,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shoot.dx * 0.25, y - shoot.dy * 0.25); ctx.stroke();
        }
      } else if (!still() && Math.random() < 0.002) {
        shoot = { x: Math.random() * W * 0.8, y: Math.random() * H * 0.4, dx: W * 0.35, dy: H * 0.2, t0: t };
      }
    };
    const loop = (t) => { if (still() || window.orbytePaused || document.hidden) { raf = null; paint(t); return; } paint(t); raf = requestAnimationFrame(loop); };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    addEventListener('resize', resize);
    addEventListener('scroll', () => { if (still() || window.orbytePaused) paint(performance.now()); }, { passive: true });
    document.addEventListener('visibilitychange', kick);
    window.orbyteKick = () => { kick(); $$('canvas[data-planet]').forEach((c) => c._planet && c._planet.start()); };
    resize(); kick();
  };

  /* =========================================================
     Texte « décodé » + apparition au scroll
     ========================================================= */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\';
  const scramble = (el) => {
    if (el.dataset.done) return; el.dataset.done = '1';
    const finalText = el.textContent;
    el.setAttribute('aria-label', finalText.replace(/\s+/g, ' ').trim());
    if (still()) return;
    const span = document.createElement('span'); span.setAttribute('aria-hidden', 'true'); span.className = 'scramble';
    const original = Array.from(el.childNodes);
    el.textContent = ''; el.appendChild(span);
    const chars = [...finalText]; const total = 900 + chars.length * 12; const t0 = performance.now();
    const step = (now) => {
      const p = (now - t0) / total;
      span.textContent = chars.map((ch, i) => (ch === ' ' || ch === '\n' || i / chars.length < p * 1.15 - 0.1) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
      if (p < 1) requestAnimationFrame(step); else { el.textContent = ''; original.forEach((n) => el.appendChild(n)); }
    };
    requestAnimationFrame(step);
  };

  const countUp = (el) => {
    if (el.dataset.done) return; el.dataset.done = '1';
    const target = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.decimals || '0', 10);
    const out = $('[data-count-out]', el) || el;
    if (still()) { out.textContent = nf(target, dec); return; }
    const t0 = performance.now(), dur = 1800;
    const step = (now) => { const p = clamp((now - t0) / dur); const e = 1 - Math.pow(1 - p, 4); out.textContent = nf(target * e, dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  const initReveal = () => {
    const els = $$('[data-reveal], [data-scramble], [data-count], .meter, .stat');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => { e.classList.add('is-visible'); if (e.dataset.count) countUp(e); }); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target; el.classList.add('is-visible');
      if (el.hasAttribute('data-scramble')) scramble(el);
      if (el.hasAttribute('data-count')) countUp(el);
      io.unobserve(el);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
    els.forEach((e) => io.observe(e));
  };

  /* =========================================================
     En-tête : horloge UTC, défilement, menu mobile
     ========================================================= */
  const initHeader = () => {
    const header = $('[data-header]');
    if (header) {
      let lastY = scrollY;
      addEventListener('scroll', () => {
        const y = scrollY;
        header.classList.toggle('is-scrolled', y > 30);
        header.classList.toggle('is-hidden', y > lastY && y > 500 && !still());
        lastY = y;
      }, { passive: true });
      header.classList.toggle('is-scrolled', scrollY > 30);
    }
    const clocks = $$('[data-utc]');
    if (clocks.length) {
      const pad = (n) => String(n).padStart(2, '0');
      const t0 = Date.now();
      const tick = () => {
        const d = new Date();
        const utc = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
        const el = Math.floor((Date.now() - t0) / 1000);
        clocks.forEach((c) => { c.textContent = c.dataset.utc === 'met' ? `T+${pad(Math.floor(el / 3600))}:${pad(Math.floor(el / 60) % 60)}:${pad(el % 60)}` : `UTC ${utc}`; });
      };
      tick(); setInterval(tick, 1000);
    }
    const nav = $('[data-mobile-nav]');
    const openBtn = $('[data-nav-open]');
    if (nav && openBtn) {
      const FOC = 'a[href], button:not([disabled]), input';
      const onKey = (e) => {
        if (e.key === 'Escape') close();
        if (e.key !== 'Tab') return;
        const f = $$(FOC, nav); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      };
      const open = () => { nav.hidden = false; requestAnimationFrame(() => nav.classList.add('is-open')); openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('[data-nav-close]', nav).focus(); document.addEventListener('keydown', onKey); };
      const close = () => { nav.classList.remove('is-open'); openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); setTimeout(() => { nav.hidden = true; }, still() ? 0 : 350); openBtn.focus(); };
      openBtn.addEventListener('click', open);
      $$('[data-nav-close]', nav).forEach((b) => b.addEventListener('click', close));
    }
  };

  /* =========================================================
     Pause globale / réduction des animations
     ========================================================= */
  const initMotion = () => {
    const sync = () => {
      const on = html.classList.contains('reduce-motion');
      $$('[data-motion-toggle]').forEach((b) => b.setAttribute('aria-pressed', on ? 'true' : 'false'));
    };
    $$('[data-motion-toggle]').forEach((b) => b.addEventListener('click', () => {
      const on = !html.classList.contains('reduce-motion');
      html.classList.toggle('reduce-motion', on);
      try { localStorage.setItem('orbyte-reduce-motion', on ? '1' : '0'); } catch (e) {}
      sync();
      if (on) { $$('[data-reveal]').forEach((e) => e.classList.add('is-visible')); announce(b.dataset.onMsg || ''); }
      else { window.orbyteKick && window.orbyteKick(); announce(b.dataset.offMsg || ''); }
    }));
    sync();
    // Boutons pause locaux (bande de données, orrery)
    $$('[data-pause]').forEach((b) => {
      const target = document.getElementById(b.getAttribute('aria-controls'));
      b.addEventListener('click', () => {
        const paused = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', paused ? 'true' : 'false');
        target?.classList.toggle('is-paused', paused);
        const lbl = $('[data-pause-label]', b);
        if (lbl) lbl.textContent = paused ? b.dataset.playText : b.dataset.pauseText;
      });
    });
    mq.addEventListener?.('change', () => { if (!still()) window.orbyteKick && window.orbyteKick(); });
  };

  /* =========================================================
     Orrery : vitesses orbitales + panneau d'informations
     ========================================================= */
  const initOrrery = () => {
    $$('[data-orrery]').forEach((root) => {
      const dataEl = $('script[type="application/json"]', root);
      if (!dataEl) return;
      const planets = JSON.parse(dataEl.textContent);
      $$('.arm', root).forEach((arm, i) => {
        const p = planets[i]; if (!p) return;
        const T = 8 * Math.sqrt((p.period || 365) / 88);
        arm.style.setProperty('--period', `${T.toFixed(1)}s`);
        arm.style.setProperty('--delay', `${(-((i * 7.3) % T)).toFixed(1)}s`);
      });
      const panel = $('[data-orrery-panel]', root);
      const buttons = $$('[data-select]', root);
      const select = (i, speak) => {
        const p = planets[i]; if (!p || !panel) return;
        buttons.forEach((b, j) => b.setAttribute('aria-pressed', i === j ? 'true' : 'false'));
        $$('.orbit', root).forEach((o, j) => o.classList.toggle('is-active', i === j));
        $$('a.body', root).forEach((o, j) => o.classList.toggle('is-active', i === j));
        $('[data-f="name"]', panel).textContent = p.name;
        $('[data-f="type"]', panel).textContent = p.type;
        $('[data-f="dist"]', panel).textContent = `${nf(p.dist, 1)} M km`;
        $('[data-f="period"]', panel).textContent = p.period >= 1000 ? `${nf(p.period / 365.25, 1)} ans` : `${nf(p.period, 1)} jours`;
        $('[data-f="diam"]', panel).textContent = `${nf(p.diam)} km`;
        $('[data-f="moons"]', panel).textContent = nf(p.moons);
        $('[data-f="temp"]', panel).textContent = `${nf(p.temp)} °C`;
        const link = $('[data-f="link"]', panel); link.href = p.url; $('[data-f="linkname"]', panel).textContent = p.name;
        if (speak) announce(`${p.name} : ${p.type}`);
      };
      buttons.forEach((b, i) => b.addEventListener('click', () => select(i, true)));
      $$('a.body', root).forEach((a, i) => { a.addEventListener('mouseenter', () => select(i)); a.addEventListener('focus', () => select(i)); });
      select(Math.min(2, planets.length - 1));
    });
  };

  /* =========================================================
     Outils de la fiche planète
     ========================================================= */
  const initTools = () => {
    $$('[data-weight]').forEach((form) => {
      const g = parseFloat(form.dataset.gravity);
      const input = $('input', form); const out = $('[data-weight-out]', form);
      const calc = () => { const kg = parseFloat(String(input.value).replace(',', '.')); out.textContent = isFinite(kg) && kg > 0 ? nf(kg * g / 9.807, 1) : '—'; };
      input.addEventListener('input', calc); form.addEventListener('submit', (e) => { e.preventDefault(); calc(); });
      calc();
    });
  };

  const initCookiePrefs = () => {
    const btns = $$('[data-cookie-preferences]'); if (!btns.length) return;
    let tries = 0;
    const iv = setInterval(() => {
      if (window.privacyBanner && typeof window.privacyBanner.showPreferences === 'function') {
        clearInterval(iv);
        btns.forEach((b) => { b.hidden = false; b.addEventListener('click', () => window.privacyBanner.showPreferences()); });
      } else if (++tries > 20) clearInterval(iv);
    }, 500);
  };

  /* Nombres au format local (1 432,0 → « 1 432 ») */
  const initNumbers = () => $$('[data-num]').forEach((el) => {
    const raw = el.textContent.trim(); const v = parseFloat(raw);
    if (!isFinite(v)) return;
    const dec = raw.includes('.') ? raw.split('.')[1].replace(/0+$/, '').length : 0;
    el.textContent = nf(v, Math.min(dec, 3));
  });

  const init = () => {
    initNumbers();
    initMotion(); initHeader(); initStarfield(); initPlanets(); initReveal(); initOrrery(); initTools(); initCookiePrefs();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
