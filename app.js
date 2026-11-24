/* Redline Barber Co.
   opener: a selection box around the logo, a loader, then the box is dragged out to fill the screen
   -> hero (giant clipped word) -> statement (scrambling words) -> services -> the cuts -> prices -> about */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasG = typeof gsap !== 'undefined';

  /* ---------------- the logo: an R built from bars, with a red line-up through it ---------------- */
  function logoSVG(draw) {
    const stem = 'M27 8 V92';
    const bowl = 'M27 15.5 H55 C71 15.5 78 25 78 37 C78 50 69 58 55 58 H27';
    const leg = 'M51 58 L80 92';
    const dp = draw ? ' pathLength="1"' : '';
    return `<svg class="rl" viewBox="0 0 100 100" role="img" aria-label="Redline Barber Co. mark">` +
      `<path class="rr"${dp} d="${stem}"/><path class="rr"${dp} d="${bowl}"/><path class="rr"${dp} d="${leg}"/>` +
      `<path class="rd"${dp} d="M0 76 H100"/><path class="rd"${dp} d="M0 68 V84 M100 68 V84"/></svg>`;
  }
  $$('[data-logo]').forEach(el => { el.innerHTML = logoSVG(el.dataset.logo === 'open'); });

  /* ---------------- menu ---------------- */
  const menu = $('#menu'), btn = $('#menuBtn');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  btn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------- scramble, counters, reveals ---------------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@';
  function scramble(el) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    const len = final.length, total = 22;
    let f = 0;
    const timer = setInterval(() => {
      f++;
      el.textContent = final.split('').map((c, i) => (c === ' ' || c === '.' ? c : i < (f / total) * len * 1.25 ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      if (f >= total + len) { el.textContent = final; clearInterval(timer); }
    }, 36);
  }
  function countUp(el) {
    const to = +el.dataset.count, dec = +el.dataset.dec || 0, plain = !!el.dataset.plain, t0 = performance.now(), dur = 1600;
    (function step(now) {
      const t = clamp((now - t0) / dur), v = to * (1 - Math.pow(1 - t, 3));
      el.textContent = plain ? Math.round(v) : dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  function setupReveals() {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      if (el.matches('[data-scramble]')) scramble(el);
      if (el.matches('.stat')) countUp($('b', el));
      io.unobserve(el);
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.bx > .c').forEach((el, i) => {
      el.classList.add('rv'); el.style.transitionDelay = (i % 4) * 0.08 + 's'; io.observe(el);
    });
    $$('[data-scramble]').forEach(el => { el.dataset.final = el.textContent; io.observe(el); });
    markEdges(); addEventListener('resize', markEdges);
  }


  // the cells that start a row get a corner square on the left edge too
  function markEdges() {
    $$('.bx').forEach(bx => {
      const cells = $$(':scope > .c', bx);
      if (!cells.length) return;
      const left = Math.min(...cells.map(c => c.offsetLeft));
      cells.forEach(c => c.classList.toggle('lc', Math.abs(c.offsetLeft - left) < 3));
    });
  }

  /* ---------------- hero parallax ---------------- */
  const heroImg = $('#heroImg img');
  function onScroll() {
    if (scrollY < innerHeight * 1.2) heroImg.style.translate = `0 ${(scrollY * 0.18).toFixed(1)}px`;
  }

  function showFinal() {
    window.__redReady = true;
    html.classList.add('ready');
    document.body.classList.remove('lock');
    ['opBg', 'opImg', 'opUI'].forEach(id => { const e = $('#' + id); if (e) e.style.display = 'none'; });
    // the hero goes back into the page exactly where it already is
    const hero = $('.hero');
    ['position', 'top', 'left', 'width', 'height', 'zIndex', 'clipPath', 'transform', 'transformOrigin', 'opacity'].forEach(k => { hero.style[k] = ''; });
    $('.nav').style.zIndex = '';
    if (hasG) {
      gsap.set(['.nav', '.hero-card', '.hero-word'], { clearProps: 'opacity,transform,filter' });
      gsap.set('#heroImg img', { scale: 1 });
    }
    setupReveals();
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- the opener ---------------- */
  // A selection box sits around the logo while it loads. Inside the box is a tiny version of the
  // finished hero; when the box is dragged out to the full screen the hero zooms up with it, so by the
  // time it is all the way open everything (photo, REDLINE, card) is already in place.
  function run() {
    document.body.classList.add('lock');
    html.classList.add('ready');
    const vw = innerWidth, vh = innerHeight, cx = vw / 2, cy = vh / 2;
    const s = Math.min(vw * 0.56, 250);
    const x = (vw - s) / 2, y = (vh - s) / 2;
    const k0 = Math.max(s / vw, s / vh);              // hero scale that just covers the box
    const box = $('#opBox'), hero = $('.hero'), nav = $('.nav');
    const gvL = $('#gvL'), gvR = $('#gvR'), ghT = $('#ghT'), ghB = $('#ghB');
    const paths = $$('.op-logo path');
    const himg = $('#heroImg img');

    paths.forEach(p => { p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1; });
    Object.assign(hero.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100vh', zIndex: '101', opacity: '0' });
    const W = hero.offsetWidth, H = hero.offsetHeight;   // the hero's own size (min-height can make it taller than the screen)
    hero.style.transformOrigin = `${cx}px ${cy}px`;
    nav.style.zIndex = '103';
    gsap.set(nav, { opacity: 0, y: -14 });
    gsap.set(['.hero-word', '.hero-card'], { opacity: 0 });   // only the photo shows behind the logo while it loads
    gsap.set(himg, { scale: 1.16 });

    const st = { p: 0 };
    function apply() {
      const p = st.p;
      const L = lerp(x, 0, p), T = lerp(y, 0, p), R = lerp(x + s, vw, p), B = lerp(y + s, vh, p);
      box.style.cssText = `left:${L}px;top:${T}px;width:${R - L}px;height:${B - T}px;opacity:${box.style.opacity || 1}`;
      gvL.style.left = L + 'px'; gvR.style.left = (R - 1) + 'px'; ghT.style.top = T + 'px'; ghB.style.top = (B - 1) + 'px';
      // scale the whole hero with the box and clip it to the box (clip is in the hero's own, unscaled space)
      const k = lerp(k0, 1, p);
      const lx = cx + (L - cx) / k, ty = cy + (T - cy) / k, rx = cx + (R - cx) / k, by = cy + (B - cy) / k;
      hero.style.transform = `scale(${k})`;
      hero.style.clipPath = `inset(${ty}px ${W - rx}px ${H - by}px ${lx}px)`;
    }
    apply();
    gsap.set(box, { opacity: 0 });

    const meter = { v: 0 };
    const T = gsap.timeline();
    T.to([gvL, gvR, ghT, ghB], { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.1)
     .to(box, { opacity: 1, duration: 0.4, ease: 'power2.out', onUpdate: apply }, 0.15)
     .to(paths.filter(p => p.classList.contains('rr')), { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.18 }, 0.45)
     .to(meter, {
       v: 100, duration: 2.1, ease: 'power1.inOut',
       onUpdate: () => { hero.style.opacity = (0.5 * meter.v / 100).toFixed(3); }
     }, 0.45)
     .to(paths.filter(p => p.classList.contains('rd')), { strokeDashoffset: 0, duration: 0.55, ease: 'power3.inOut', stagger: 0.1 }, 2.0)
     .addLabel('open', 2.95)
     .to('.op-logo', { opacity: 0, duration: 0.45, ease: 'power2.out' }, 'open')
     .to(hero, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 'open')
     // one smooth move: the box blows up to the full screen and the hero zooms up inside it
     .to(st, { p: 1, duration: 1.8, ease: 'power3.inOut', onUpdate: apply }, 'open')
     .to(himg, { scale: 1, duration: 2.4, ease: 'power2.out' }, 'open')
     .to(['.hero-word', '.hero-card'], { opacity: 1, duration: 0.7, ease: 'power2.out' }, 'open+=0.2')
     .to([gvL, gvR, ghT, ghB, box], { opacity: 0, duration: 0.5, ease: 'power2.out' }, 'open+=1.3')
     .to(nav, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'open+=1.2')
     .add(showFinal, 'open+=1.85');
    window.__redT = T;
  }

  /* ---------------- cursor: a soft smoke trail (like surya-aditya.com, but smaller) ----------------
     The normal pointer stays. Behind it, little puffs of smoke are laid along the path and drift out and
     fade. White over the dark sections, dark smoke over the light grey and red ones so it always shows. */
  function setupTrail() {
    if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const cv = document.createElement('canvas');
    cv.className = 'trail'; cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    const ctx = cv.getContext('2d');
    const S = 0.5;                                     // drawn at half size; it's blurred anyway
    let W = 0, H = 0;
    function size() { W = cv.width = Math.ceil(innerWidth * S); H = cv.height = Math.ceil(innerHeight * S); }
    size(); addEventListener('resize', size);

    // one soft puff, pre-drawn once in white and once in near-black
    function puff(rgb) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.6)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return c;
    }
    const LIGHT = puff('245,245,243'), DARK = puff('10,10,11');

    const pts = [];
    let lx = null, ly = null, dark = false;
    document.addEventListener('mouseover', e => {
      const t = e.target instanceof Element ? e.target : null;
      dark = !!(t && t.closest('.lt, section.rd, .foot-ticker') && !t.closest('.nav, .menu'));
    });
    addEventListener('mousemove', e => {
      const x = e.clientX, y = e.clientY;
      if (lx === null) { lx = x; ly = y; return; }
      const dx = x - lx, dy = y - ly, dist = Math.hypot(dx, dy);
      const n = Math.min(20, Math.ceil(dist / 5));
      const r = 13 + Math.min(dist * 0.2, 10);        // a quick flick puffs a little bigger
      for (let i = 1; i <= n; i++) pts.push({ x: lx + dx * i / n, y: ly + dy * i / n, r, life: 1, dark });
      if (pts.length > 240) pts.splice(0, pts.length - 240);
      lx = x; ly = y;
    }, { passive: true });
    html.addEventListener('mouseleave', () => { lx = null; });

    let was = false;
    (function loop() {
      if (pts.length || was) {
        ctx.clearRect(0, 0, W, H);
        for (let i = pts.length - 1; i >= 0; i--) {
          const p = pts[i];
          p.life -= 0.024;                              // about 0.7s to fade
          if (p.life <= 0) { pts.splice(i, 1); continue; }
          p.r += 0.22;                                  // smoke spreads as it fades
          ctx.globalAlpha = p.life * p.life * (p.dark ? 0.16 : 0.24);
          const rr = p.r * S;
          ctx.drawImage(p.dark ? DARK : LIGHT, p.x * S - rr, p.y * S - rr, rr * 2, rr * 2);
        }
        ctx.globalAlpha = 1;
        was = pts.length > 0;
      }
      requestAnimationFrame(loop);
    })();
  }
  setupTrail();

  /* ---------------- go ---------------- */
  if (!hasG || reduce) { showFinal(); return; }
  const first = new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = 'images/hero.jpg'; });
  Promise.race([Promise.all([document.fonts ? document.fonts.ready : 0, first]), new Promise(r => setTimeout(r, 3500))]).then(run);
})();
