// 3D scene: one point cloud that morphs noise -> neural lattice -> endless knot.
// Everything is driven by uniforms the scroll driver sets; the clock is GSAP's ticker (see main.ts).
import { Renderer, Camera, Transform, Program, Mesh, Geometry } from 'ogl';

const vertex = /* glsl */ `
  attribute vec3 aNoise;
  attribute vec3 aLat;
  attribute vec3 aKnot;
  attribute vec4 aRand;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime, uP, uIntro, uPx;
  varying vec3 vCol;
  varying float vA;

  void main() {
    float s1 = smoothstep(0., 1., clamp((uP - aRand.x * 0.4) / 0.6, 0., 1.));
    float s2 = smoothstep(0., 1., clamp((uP - 2. - aRand.x * 0.4) / 0.6, 0., 1.));
    // idle drift: the noise breathes even when nobody scrolls
    vec3 n = aNoise * (0.15 + 0.85 * uIntro);
    n += 0.12 * vec3(sin(uTime * 0.6 + aRand.w * 6.28), cos(uTime * 0.5 + aRand.w * 9.), sin(uTime * 0.4 + aRand.w * 3.));
    vec3 l = aLat + 0.015 * vec3(0., sin(uTime + aRand.w * 20.), cos(uTime + aRand.w * 20.));
    vec3 k = aKnot + 0.02 * vec3(sin(uTime * 0.8 + aRand.w * 30.), cos(uTime * 0.7 + aRand.w * 30.), 0.);
    vec3 pos = mix(mix(n, l, s1), k, s2);

    vec4 mv = modelViewMatrix * vec4(pos, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (0.7 + aRand.y * 1.5) * (6. / -mv.z) * mix(1.0, 1.15, s1);

    vec3 dust = vec3(0.95, 0.78, 0.5);
    vec3 gold = vec3(0.91, 0.64, 0.09);
    vec3 red = vec3(0.86, 0.26, 0.12);
    vec3 paper = vec3(0.96, 0.92, 0.84);
    vec3 c = mix(dust, mix(gold, paper, step(0.93, aRand.z)), s1);
    c = mix(c, mix(gold, red, smoothstep(0.35, 0.9, aRand.z)), s2);
    vCol = c;
    vA = mix(0.7, 0.9, s1) * clamp(1.5 - length(mv.xyz) * 0.04, 0.5, 1.);
  }
`;
const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol * (0.7 + 0.6 * a), a * vA);
  }
`;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function build(count: number) {
  const noise = new Float32Array(count * 3);
  const lat = new Float32Array(count * 3);
  const knot = new Float32Array(count * 3);
  const rand = new Float32Array(count * 4);

  // lattice: 5 layers of 6x6 neurons; blobs at neurons, beams between adjacent layers
  const L = 5, G = 6, spanX = 2.6, spanYZ = 1.5;
  const neuron = (l: number, i: number, j: number): [number, number, number] => [
    -spanX + (2 * spanX * l) / (L - 1),
    -spanYZ + (2 * spanYZ * i) / (G - 1),
    -spanYZ + (2 * spanYZ * j) / (G - 1),
  ];

  for (let p = 0; p < count; p++) {
    // noise: a loose shell with a dense core
    const r = 2 + Math.abs(gauss()) * 3.2;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(rnd(-1, 1));
    noise.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.8, r * Math.sin(ph) * Math.sin(th)], p * 3);

    // lattice
    if (Math.random() < 0.28) {
      const a = neuron(Math.floor(Math.random() * L), Math.floor(Math.random() * G), Math.floor(Math.random() * G));
      lat.set([a[0] + gauss() * 0.07, a[1] + gauss() * 0.07, a[2] + gauss() * 0.07], p * 3);
    } else {
      const l = Math.floor(Math.random() * (L - 1));
      const a = neuron(l, Math.floor(Math.random() * G), Math.floor(Math.random() * G));
      const b = neuron(l + 1, Math.floor(Math.random() * G), Math.floor(Math.random() * G));
      const t = Math.random();
      lat.set([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], p * 3);
    }

    // knot: torus knot (2,3), the "endless knot" shape, with a soft tube
    const t = Math.random() * Math.PI * 2;
    const rr = Math.cos(3 * t) + 2;
    const kx = rr * Math.cos(2 * t) * 0.78, ky = rr * Math.sin(2 * t) * 0.78, kz = -Math.sin(3 * t) * 0.78;
    const tube = 0.1 + Math.random() * 0.1;
    knot.set([kx + gauss() * tube, ky + gauss() * tube, kz + gauss() * tube], p * 3);

    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], p * 4);
  }
  return { noise, lat, knot, rand };
}

export type Scene = {
  setProgress(p: number): void;      // 0..3, chapter position
  setSpin(r: number): void;          // extra rotation from scroll
  setPointer(x: number, y: number): void;
  setActive(on: boolean): void;
  render(timeSec: number): void;
  intro(v: number): void;
  destroy(): void;
};

export function createScene(host: HTMLElement): Scene {
  const small = matchMedia('(max-width: 640px)').matches;
  const renderer = new Renderer({ alpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio, 1.75) });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  host.appendChild(gl.canvas);

  const camera = new Camera(gl, { fov: 38, near: 0.1, far: 60 });
  const scene = new Transform();

  const count = small ? 5500 : 11000;
  const d = build(count);
  const geometry = new Geometry(gl, {
    position: { size: 3, data: d.noise },
    aNoise: { size: 3, data: d.noise },
    aLat: { size: 3, data: d.lat },
    aKnot: { size: 3, data: d.knot },
    aRand: { size: 4, data: d.rand },
  });
  const program = new Program(gl, {
    vertex, fragment, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uP: { value: 0 }, uIntro: { value: 0 }, uPx: { value: 1 } },
  });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive: glow where points overlap
  const points = new Mesh(gl, { mode: gl.POINTS, geometry, program });
  points.setParent(scene);

  let spin = 0, px = 0, py = 0, tx = 0, ty = 0, active = true, lastP = 0;

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    camera.perspective({ aspect: w / h });
    program.uniforms.uPx.value = renderer.dpr * (h / 900) * 5.2;
  }
  resize();
  addEventListener('resize', resize);

  return {
    setProgress(p) { lastP = p; program.uniforms.uP.value = p; },
    setSpin(r) { spin = r; },
    setPointer(x, y) { tx = x; ty = y; },
    setActive(on) { active = on; },
    intro(v) { program.uniforms.uIntro.value = v; },
    render(t) {
      if (!active) return;
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      const aspect = host.clientWidth / host.clientHeight;
      const mobile = aspect < 0.9;
      // camera dolly follows the chapters: wide for noise, close for lattice, settled for the knot
      const dist = (lastP < 1 ? 11 - lastP * 3.4 : lastP < 2 ? 7.6 : 7.6 + (lastP - 2) * 0.6) * (mobile ? 1.55 : 1);
      camera.position.set(0, mobile ? -0.5 : 0, dist);
      camera.lookAt([0, 0, 0]);
      points.position.x = mobile ? 0 : 1.6;
      points.position.y = mobile ? 1.7 : 0;
      points.rotation.y = t * 0.06 + spin + px * 0.35;
      points.rotation.x = 0.18 + py * 0.2 + Math.sin(lastP * 1.2) * 0.15;
      points.rotation.z = lastP > 2 ? (lastP - 2) * 0.25 : 0;
      program.uniforms.uTime.value = t;
      renderer.render({ scene, camera });
    },
    destroy() { removeEventListener('resize', resize); },
  };
}
