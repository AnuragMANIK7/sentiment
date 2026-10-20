// One clock (GSAP's ticker) drives Lenis, the camera's station value, the HUD and the WebGL render.
import gsap from 'gsap';
import Lenis from 'lenis';
import { createWorld, type World } from './world/world';
import { createTanpura } from './sound';
import { chapters } from '../data/site';

const root = document.documentElement;
const motion = root.classList.contains('motion');
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];
const pad = (n: number) => String(n).padStart(2, '0');
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ---------- Waitlist form (no backend yet: hands the details to the visitor's mail app) ---------- */
const form = $<HTMLFormElement>('#waitlist');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const status = $('#status')!;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    status.textContent = 'Please add your name and a valid email address.';
    return;
  }
  const to = $('#contact')?.textContent ?? '';
  const body = `Name: ${name}\nEmail: ${email}\nTask I want AI to do: ${data.get('task') || ''}`;
  status.textContent = `Thanks, ${name}. If your email app does not open, write to ${to}.`;
  location.href = `mailto:${to}?subject=${encodeURIComponent('ShubhLabh AI Course waitlist')}&body=${encodeURIComponent(body)}`;
});

/* ---------- Scramble for mono labels: fixed-width glyphs, so nothing reflows ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%+=/<>';
function scramble(el: HTMLElement, duration = 0.75) {
  if (!motion) return;
  const nodes: Text[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push(walk.currentNode as Text);
  const finals = nodes.map((n) => n.nodeValue || '');
  const o = { p: 0 };
  gsap.killTweensOf(el);
  gsap.to(o, {
    p: 1, duration, ease: 'none',
    onUpdate: () => nodes.forEach((n, i) => {
      const f = finals[i];
      const k = Math.floor(o.p * f.length);
      n.nodeValue = f.slice(0, k) + [...f.slice(k)].map((ch) => (/[\s·/ऀ-ॿ]/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    }),
    onComplete: () => nodes.forEach((n, i) => (n.nodeValue = finals[i])),
  });
}

/* ---------- Sound ---------- */
const soundBtn = $<HTMLButtonElement>('#sound');
const bars = soundBtn ? $$('.sound__bars i') : [];
const tanpura = createTanpura((s) => {
  const b = bars[s];
  if (!b) return;
  b.classList.add('pluck');
  window.setTimeout(() => b.classList.remove('pluck'), 320);
});
soundBtn?.addEventListener('click', async () => {
  const on = await tanpura.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.querySelector('b')!.textContent = on ? 'on' : 'off';
});

/* ---------- Footer mark lit by the pointer ---------- */
const foot = $('.foot__big');
foot?.addEventListener('pointermove', (e) => {
  const r = foot.getBoundingClientRect();
  foot.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  foot.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
});

/* ---------- Smooth scroll ---------- */
let lenis: Lenis | null = null;
if (motion) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href')!;
    const el = id === '#top' ? document.body : document.querySelector<HTMLElement>(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { duration: 2.2 });
    else el.scrollIntoView();
    const focusEl = id === '#top' ? $('#main') : el;
    focusEl?.setAttribute('tabindex', focusEl.getAttribute('tabindex') ?? '-1');
    focusEl?.focus({ preventScroll: true });
  }),
);

/* ---------- Layout measurements (scroll positions of stations, chapters, paper) ---------- */
type Range = { a: number; b: number };
let anchors: { y: number; s: number }[] = [];
let chapterR: (Range & { i: number })[] = [];
let weekR: (Range & { w: number })[] = [];
let paperR: Range[] = [];
let maxScroll = 1;
function measure() {
  const vh = innerHeight;
  maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  const abs = (el: HTMLElement) => { const r = el.getBoundingClientRect(); const a = r.top + scrollY; return { a, b: a + r.height }; };
  anchors = $$('[data-station]').map((el) => {
    const { a, b } = abs(el);
    return { y: clamp((a + b) / 2 - vh / 2, 0, maxScroll), s: parseFloat(el.dataset.station!) };
  }).sort((p, q) => p.y - q.y);
  chapterR = $$('[data-chapter]').map((el) => ({ ...abs(el), i: +el.dataset.chapter! }));
  weekR = $$('[data-week]').map((el) => ({ ...abs(el), w: +el.dataset.week! }));
  paperR = [];
  for (const el of $$('.paper')) {
    const r = abs(el);
    const last = paperR[paperR.length - 1];
    if (last && r.a <= last.b + 2) last.b = r.b; else paperR.push(r);
  }
}
function stationAt(y: number) {
  if (!anchors.length) return 0;
  if (y <= anchors[0].y) return anchors[0].s;
  for (let i = 0; i < anchors.length - 1; i++) {
    const p = anchors[i], q = anchors[i + 1];
    if (y < q.y) return p.s + (q.s - p.s) * ((y - p.y) / Math.max(1, q.y - p.y));
  }
  return anchors[anchors.length - 1].s;
}

/* ---------- HUD ---------- */
const hudIdx = $('#hud-idx'), hudName = $('#hud-name'), hudClock = $('#hud-clock'), hudMark = $('#hud-mark');
let lastLabel = '';
let lastWeek = 0;
const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
let lastSec = -1;
// The HUD steps aside while scrolling down and returns on scroll up or when the page rests
let lastY = 0;
let movedAt = 0;
function frame(y: number) {
  const now = performance.now();
  const dy = y - lastY;
  if (Math.abs(dy) > 2) {
    movedAt = now;
    if (dy > 0 && y > 140) root.classList.add('frame-away');
    else if (dy < 0) root.classList.remove('frame-away');
  } else if (now - movedAt > 900) root.classList.remove('frame-away');
  lastY = y;
}
function hud(y: number) {
  frame(y);
  const mid = y + innerHeight / 2;
  const ch = chapterR.find((r) => mid >= r.a && mid < r.b);
  const wk = weekR.find((r) => mid >= r.a && mid < r.b);
  const i = ch ? ch.i : mid < (chapterR[0]?.a ?? 0) ? 0 : chapters.length - 1;
  const label = chapters[i] + (wk ? ` · Week ${wk.w}` : '');
  if (label !== lastLabel && hudIdx && hudName) {
    lastLabel = label;
    hudIdx.textContent = `${pad(i + 1)}/${pad(chapters.length)}`;
    hudName.textContent = label;
    scramble(hudIdx, 0.4);
    scramble(hudName, 0.5);
  }
  const w = wk ? wk.w : 0;
  if (w && w !== lastWeek) tanpura.chime();
  lastWeek = w;
  hudMark?.style.setProperty('--p', String(clamp(y / maxScroll, 0, 1)));
  const inPaper = (v: number) => paperR.some((r) => v >= r.a && v <= r.b);
  root.classList.toggle('ink-top', inPaper(y + 32));
  root.classList.toggle('ink-bottom', inPaper(y + innerHeight - 24));
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  if (sec !== lastSec && hudClock) { lastSec = sec; hudClock.textContent = clockFmt.format(now); }
}

/* ---------- Reveals: light sweeps over headings, labels decode ---------- */
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const el = en.target as HTMLElement;
    if (el.classList.contains('sweep')) el.classList.add('lit');
    if (el.hasAttribute('data-scramble')) scramble(el);
    io.unobserve(el);
  }
}, { rootMargin: '0px 0px -18% 0px' });
const heroEls = new Set($$('.st--hero .sweep, .st--hero [data-scramble]'));
function watchReveals() {
  $$('.sweep, [data-scramble]').forEach((el) => { if (!heroEls.has(el)) io.observe(el); });
}

/* ---------- The world ---------- */
let world: World | null = null;
const cur = { c: 0 };
function failGL() {
  root.classList.remove('gl', 'loading');
  $('#gl')?.replaceChildren();
  world = null;
  lenis?.start();
}

function startLoop() {
  gsap.ticker.add((time) => {
    const y = lenis ? lenis.scroll : scrollY;
    hud(y);
    if (!world) return;
    const target = stationAt(y);
    cur.c += (target - cur.c) * (1 - Math.pow(0.86, gsap.ticker.deltaRatio()));
    const covered = paperR.some((r) => y >= r.a - 2 && y + innerHeight <= r.b + 2);
    world.setActive(!covered && document.visibilityState === 'visible');
    world.update(cur.c, time);
    world.render();
  });
}

function intro() {
  root.classList.remove('loading');
  lenis?.start();
  $$('.st--hero .sweep').forEach((el) => setTimeout(() => el.classList.add('lit'), 350));
  $$('.st--hero [data-scramble]').forEach((el) => scramble(el, 0.9));
  if (motion) gsap.from('.st--hero .lede, .st--hero .actions, .st--hero .mark', { y: 24, duration: 1.2, ease: 'power3.out', stagger: 0.08, delay: 0.3 });
}

async function boot() {
  measure();
  watchReveals();
  startLoop();
  addEventListener('resize', () => { measure(); world?.resize(); });
  document.fonts?.ready.then(measure);
  addEventListener('load', measure);
  addEventListener('pointermove', (e) => world?.setPointer((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2), { passive: true });

  if (!root.classList.contains('gl')) {
    // no loader without WebGL: everything is already on screen
    $$('.sweep').forEach((el) => el.classList.add('lit'));
    return;
  }
  lenis?.stop();
  const loader = $('#loader')!, count = $('#loader-count')!;
  // a returning visitor in this session gets the quiet loader: just the counter
  try { if (sessionStorage.getItem('sl-lit')) loader.classList.add('quick'); sessionStorage.setItem('sl-lit', '1'); } catch {}
  const shown = { p: 0 };
  let target = 0;
  let ready = false;
  const tick = () => {
    shown.p += (target - shown.p) * 0.18;
    if (target >= 1 && shown.p > 0.995) shown.p = 1;
    loader.style.setProperty('--lp', shown.p.toFixed(3));
    count.textContent = String(Math.round(shown.p * 100)).padStart(3, '0');
    if (ready && shown.p === 1) {
      gsap.ticker.remove(tick);
      loader.classList.add('done');
      intro();
      const v = { i: 0 };
      gsap.to(v, { i: 1, duration: 2.6, ease: 'power2.out', onUpdate: () => world?.setIntro(v.i) });
      window.setTimeout(() => world?.warm(), 2800);
    }
  };
  gsap.ticker.add(tick);
  try {
    world = createWorld($('#gl')!);
    await world.init((p) => (target = p));
    ready = true;
    target = 1;
  } catch (err) {
    console.warn('WebGL unavailable, showing the still version', err);
    gsap.ticker.remove(tick);
    failGL();
    $$('.sweep').forEach((el) => el.classList.add('lit'));
  }
}
boot();
