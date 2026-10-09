// Seller Ops Research landing: no cookies, no analytics, no third-party requests (three.js is self-hosted).
(() => {
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  // nav + sticky CTA
  const nav = d.querySelector('.nav'), sticky = d.querySelector('.sticky'), hero = d.querySelector('.hero'), final = d.querySelector('.final');
  const onScroll = () => {
    const y = scrollY;
    nav && nav.classList.toggle('solid', y > 30);
    if (sticky && hero) {
      const past = y > hero.offsetHeight * .7;
      const atEnd = final && final.getBoundingClientRect().top < innerHeight;
      sticky.classList.toggle('show', past && !atEnd);
    }
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // scroll reveal
  const rv = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  // hero 3D stage: pointer + scroll parallax
  const scene = d.querySelector('.scene');
  if (scene && !reduce) {
    let tx = -14, ty = 8;
    if (fine) addEventListener('pointermove', e => {
      tx = -14 + (e.clientX / innerWidth - .5) * 18;
      ty = 8 - (e.clientY / innerHeight - .5) * 12;
      scene.style.setProperty('--ry', tx + 'deg'); scene.style.setProperty('--rx', ty + 'deg');
    }, { passive: true });
    addEventListener('scroll', () => {
      const p = Math.min(scrollY / innerHeight, 1);
      scene.style.setProperty('--rx', (ty + p * 14) + 'deg');
    }, { passive: true });
  }

  // tilt cards
  if (fine && !reduce) d.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  // before/after slider
  d.querySelectorAll('.ba').forEach(ba => {
    const input = ba.querySelector('input');
    const set = v => ba.style.setProperty('--p', v + '%');
    input.addEventListener('input', () => set(input.value)); set(input.value);
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return; io.disconnect();
        let t = 0; const tick = () => { t += .02; const v = 50 + Math.sin(t * 3) * 28 * (1 - t); if (t < 1) { set(v); input.value = v; requestAnimationFrame(tick); } else { set(50); input.value = 50; } };
        requestAnimationFrame(tick);
      }), { threshold: .5 });
      io.observe(ba);
    }
  });

  // WebGL particle wave in hero (progressive enhancement)
  const cv = d.getElementById('gl');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (!cv || reduce || saveData) return;
  try { const t = d.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) return; } catch (e) { return; }
  const start = () => import('./vendor/three.module.min.js').then(T => {
    const css = getComputedStyle(root);
    const c1 = new T.Color(css.getPropertyValue('--a').trim()), c2 = new T.Color(css.getPropertyValue('--a3').trim());
    const r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: false, powerPreference: 'low-power' });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(55, 1, .1, 100);
    cam.position.set(0, 3.2, 9); cam.lookAt(0, 0, 0);
    const W = innerWidth < 700 ? 90 : 150, H = innerWidth < 700 ? 45 : 70, pos = new Float32Array(W * H * 3);
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) { const k = (i * H + j) * 3; pos[k] = (i / W - .5) * 26; pos[k + 1] = 0; pos[k + 2] = (j / H - .5) * 14; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { t: { value: 0 }, c1: { value: c1 }, c2: { value: c2 }, mx: { value: 0 } },
      vertexShader: `uniform float t;uniform float mx;varying float h;void main(){vec3 p=position;float w=sin(p.x*.45+t)*.55+cos(p.z*.6+t*.8)*.45+sin((p.x+p.z)*.25+t*.6+mx)*.5;p.y=w;h=w;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=(2.4+w*1.2)*(9./-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 c1;uniform vec3 c2;varying float h;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(mix(c1,c2,h*.6+.5),(1.-d*2.)*.9);}`
    });
    const pts = new T.Points(g, m); pts.position.y = -1.6; sc.add(pts);
    const size = () => { const w = cv.clientWidth, h = cv.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); addEventListener('resize', size);
    let vis = true, mxT = 0;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(cv);
    addEventListener('pointermove', e => { mxT = (e.clientX / innerWidth - .5) * 2; }, { passive: true });
    const clock = new T.Clock();
    const loop = () => { requestAnimationFrame(loop); if (!vis || d.hidden) return; m.uniforms.t.value = clock.getElapsedTime() * .6; m.uniforms.mx.value += (mxT - m.uniforms.mx.value) * .03; pts.rotation.y = m.uniforms.mx.value * .06; r.render(sc, cam); };
    loop(); cv.classList.add('on');
  }).catch(() => {});
  ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 600);
})();
