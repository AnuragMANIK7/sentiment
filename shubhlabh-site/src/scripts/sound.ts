// A tanpura drone synthesised with Web Audio: four strings (Pa, Sa, Sa, low Sa) plucked in a cycle.
// The "jawari" buzz is a bandpass sweeping down through the harmonics of each pluck. Off until asked.
export function createTanpura(onPluck?: (string: number) => void) {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let wet: GainNode;
  let timer = 0;
  let next = 0;
  let step = 0;
  let on = false;
  const SA = 138.59; // C#3
  const strings = [SA * 0.75, SA, SA, SA / 2];
  const gaps = [1.15, 1.15, 1.15, 1.75];

  function impulse(c: AudioContext, seconds: number) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  function setup() {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 3.2);
    wet = ctx.createGain();
    wet.gain.value = 0.32;
    master.connect(lp);
    lp.connect(ctx.destination);
    master.connect(verb);
    verb.connect(wet);
    wet.connect(ctx.destination);
  }

  function pluck(freq: number, when: number, level: number) {
    const c = ctx!;
    const body = c.createGain();
    body.gain.setValueAtTime(0.0001, when);
    body.gain.exponentialRampToValueAtTime(level, when + 0.02);
    body.gain.exponentialRampToValueAtTime(0.0001, when + 5);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 5;
    bp.frequency.setValueAtTime(freq * 16, when);
    bp.frequency.exponentialRampToValueAtTime(freq * 2.5, when + 3.4);
    const a = c.createOscillator();
    const b = c.createOscillator();
    a.type = b.type = 'sawtooth';
    a.frequency.value = freq;
    b.frequency.value = freq * 1.003;
    a.connect(bp);
    b.connect(bp);
    bp.connect(body);
    const fund = c.createOscillator();
    fund.frequency.value = freq;
    const fg = c.createGain();
    fg.gain.setValueAtTime(0.0001, when);
    fg.gain.exponentialRampToValueAtTime(level * 0.9, when + 0.04);
    fg.gain.exponentialRampToValueAtTime(0.0001, when + 5.4);
    fund.connect(fg);
    body.connect(master);
    fg.connect(master);
    for (const o of [a, b, fund]) { o.start(when); o.stop(when + 5.6); }
  }

  function schedule() {
    if (!ctx || !on) return;
    while (next < ctx.currentTime + 0.25) {
      const s = step % 4;
      pluck(strings[s], next, s === 3 ? 0.16 : 0.12);
      const delay = Math.max(0, (next - ctx.currentTime) * 1000);
      window.setTimeout(() => onPluck?.(s), delay);
      next += gaps[s];
      step++;
    }
  }

  return {
    get on() { return on; },
    async toggle() {
      if (!ctx) setup();
      const c = ctx!;
      on = !on;
      if (on) {
        await c.resume();
        next = c.currentTime + 0.08;
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setTargetAtTime(0.5, c.currentTime, 0.6);
        schedule();
        timer = window.setInterval(schedule, 100);
      } else {
        window.clearInterval(timer);
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setTargetAtTime(0, c.currentTime, 0.25);
        window.setTimeout(() => { if (!on) c.suspend(); }, 1500);
      }
      return on;
    },
    // a small bell when a new week comes into view
    chime() {
      if (!ctx || !on) return;
      const c = ctx;
      const t = c.currentTime + 0.01;
      [1108.7, 2217.5, 3326].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05 / (i + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / (i + 1));
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 1.7);
      });
    },
  };
}
