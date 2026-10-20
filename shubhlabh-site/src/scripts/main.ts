// One clock: GSAP's ticker drives Lenis, ScrollTrigger and the WebGL render. No rAF loops of our own.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene, type Scene } from './scene';

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
const motion = root.classList.contains('motion');
const hasGL = root.classList.contains('gl');

// Waitlist form: opens the visitor's mail app (no backend yet; swap for an API call later)
const form = document.getElementById('waitlist') as HTMLFormElement | null;
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const status = document.getElementById('status')!;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    status.textContent = 'Please add your name and a valid email.';
    return;
  }
  const body = `Name: ${name}\nEmail: ${email}\nTask I want AI to do: ${data.get('task') || ''}`;
  const to = document.querySelector<HTMLAnchorElement>('.foot a')?.textContent ?? '';
  status.textContent = 'Opening your email app to send the request.';
  location.href = `mailto:${to}?subject=${encodeURIComponent('ShubhLabh AI Course waitlist')}&body=${encodeURIComponent(body)}`;
});

let lenis: Lenis | null = null;
if (motion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')!;
      const el = id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (el) { e.preventDefault(); lenis!.scrollTo(el, { duration: 1.4 }); }
    }),
  );
}

const hero = document.querySelector<HTMLElement>('.hero');
const panels = [...document.querySelectorAll<HTMLElement>('.hero__panel[data-panel]')];

if (hasGL && hero && panels.length > 1) {
  const host = document.getElementById('gl')!;
  let scene: Scene | null = null;
  try {
    scene = createScene(host);
  } catch {
    root.classList.remove('gl');
  }

  if (scene) {
    const s = scene;
    const ticks = [...document.querySelectorAll<HTMLElement>('.ticks li')];
    const target = { p: 0, spin: 0 };
    const cur = { p: 0, spin: 0 };
    let inHero = true, inEnroll = false;
    const sync = () => s.setActive(inHero || inEnroll);

    // Hero intro: the cloud expands out of a point, the first chapter rises in
    const intro = { v: 0 };
    gsap.to(intro, { v: 1, duration: 2.2, ease: 'power3.out', onUpdate: () => s.intro(intro.v) });
    gsap.from(panels[0].children, { y: 36, duration: 1.2, ease: 'power3.out', stagger: 0.09, delay: 0.25 });

    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: '+=360%', pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => { target.p = self.progress * 3; target.spin = self.progress * 2.4; },
      onToggle: (self) => { inHero = self.isActive || self.progress === 0; sync(); },
      onLeave: () => { target.p = 3; target.spin = 2.4; inHero = false; sync(); },
      onEnterBack: () => { inHero = true; sync(); },
    });
    ScrollTrigger.create({
      trigger: '#enroll', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { inEnroll = self.isActive; sync(); },
      onUpdate: (self) => { if (!inHero) target.spin = 2.4 + self.progress * 1.6; },
    });

    addEventListener('pointermove', (e) => {
      s.setPointer((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
    }, { passive: true });

    // Chapter text: each panel is visible around its own integer position on the chapter axis
    const last = panels.length - 1;
    gsap.ticker.add((time) => {
      cur.p += (target.p - cur.p) * 0.085;
      cur.spin += (target.spin - cur.spin) * 0.085;
      s.setProgress(cur.p);
      s.setSpin(cur.spin);
      panels.forEach((el, i) => {
        const dist = target.p - i;
        const vis = Math.max(0, 1 - Math.abs(dist) * 2.1);
        const hold = i === last && dist > 0 ? 1 : i === 0 && dist < 0 ? 1 : vis;
        el.style.opacity = String(Math.min(1, hold));
        el.style.visibility = hold > 0.01 ? 'visible' : 'hidden';
        el.style.transform = `translate3d(0, ${(-dist * 28).toFixed(1)}px, 0)`;
      });
      ticks.forEach((t, i) => t.classList.toggle('on', Math.round(Math.max(0, Math.min(last, target.p))) === i));
      s.render(time);
    });
    document.querySelector<HTMLElement>('.scroll-hint')!.style.opacity = '1';
    ScrollTrigger.create({ start: 80, end: 81, onToggle: (self) => {
      gsap.to('.scroll-hint', { opacity: self.isActive || self.progress > 0 ? 0 : 1, duration: 0.4 });
    } });
  }
}

// Section reveals: skipped under reduced motion so all content stays visible
if (motion) {
  gsap.utils.toArray<HTMLElement>('.sec-head, .entry, .split > div, .format div').forEach((el) => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
}

// Header ink flips to dark while it sits over a paper section
const bar = document.querySelector<HTMLElement>('.bar');
document.querySelectorAll<HTMLElement>('section.paper').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 40px', end: 'bottom 40px',
    onToggle: (self) => bar?.classList.toggle('ink', self.isActive),
  });
});
