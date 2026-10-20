// Geometry and materials for the ShubhLabh world. Every piece is procedural: no model files.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const COLORS = {
  ground: new THREE.Color(0x0b0806),
  gold: new THREE.Color(0xe8a317),
};

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
`;

/* ---------- Diya: a lathe bowl with a pinched spout ---------- */
export function diyaGeometry(segments = 48) {
  const profile = [
    [0.0, 0.0], [0.17, 0.0], [0.19, 0.012], [0.18, 0.03], [0.22, 0.045], [0.32, 0.08], [0.41, 0.13],
    [0.47, 0.185], [0.5, 0.225], [0.49, 0.24], [0.465, 0.235], [0.43, 0.195], [0.34, 0.14], [0.2, 0.105], [0.0, 0.095],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(profile, segments);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    const th = Math.atan2(z, x);
    const lobe = Math.pow(Math.max(Math.cos(th), 0), 6) * THREE.MathUtils.smoothstep(y, 0.08, 0.23);
    const rr = r * (1 + 0.55 * lobe);
    p.setXYZ(i, Math.cos(th) * rr, y + 0.035 * lobe * (y / 0.24), Math.sin(th) * rr * 0.9);
  }
  g.computeVertexNormals();
  return g;
}
// Where the flame sits, in diya-local units (on the spout lip)
export const SPOUT = new THREE.Vector3(0.69, 0.27, 0);

/* ---------- Flame: camera-facing teardrop, HDR and additive ---------- */
export function flameMaterial(seed = 0) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uScale: { value: 0.27 }, uSway: { value: 0 }, uSeed: { value: seed } },
    vertexShader: /* glsl */ `
      uniform float uScale, uSway;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(0., 0., 0., 1.);
        vec2 off = vec2((uv.x - .5) * .8, uv.y - .08) * uScale;
        off.x += uSway * uv.y * uv.y * uScale * .35;
        mv.xy += off;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity, uSeed;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main(){
        float t = uTime + uSeed * 10.;
        float n = vnoise(vec2(vUv.y * 4. - t * 3., t * .7 + uSeed * 3.)) - .5;
        float x = (vUv.x - .5) * 1.6;
        float y = vUv.y;
        x -= n * .3 * y;
        float yb = .2;
        float w = y < yb ? sqrt(max(0., 1. - pow((yb - y) / yb, 2.))) : pow(max(0., 1. - (y - yb) / (.92 - yb)), 1.15);
        w *= .3 + n * .04;
        float d = abs(x) / max(w, 1e-3);
        float body = smoothstep(1., .55, d) * step(y, .92);
        float core = smoothstep(.8, 0., d) * smoothstep(.7, .05, y);
        vec3 col = mix(vec3(1., .3, .05), vec3(1., .7, .24), smoothstep(0., .7, 1. - d));
        col = mix(col, vec3(1., .96, .86), core);
        col = mix(col, vec3(.2, .3, 1.), smoothstep(.1, 0., y) * smoothstep(1., .2, d) * .6);
        float halo = exp(-dot(vec2(x * 1.3, (y - .28) * 1.7), vec2(x * 1.3, (y - .28) * 1.7)) * 4.) * .22;
        vec3 c = col * body * smoothstep(0., .04, y) * 2.2 + vec3(1., .5, .15) * halo;
        gl_FragColor = vec4(c * uIntensity, 1.);
      }`,
  });
}

/* ---------- Shared point-sprite helpers ---------- */
// uK = pixels per world unit at distance 1 (set from viewport height, DPR and FOV)
const POINT_HEAD = /* glsl */ `uniform float uK, uTime, uFog; varying float vFog;`;
const fogOut = /* glsl */ `vFog = exp(-pow(uFog * length(mv.xyz), 2.));`;

/* ---------- Embers: drift up through the whole journey ---------- */
export function embers(count: number) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos.set([THREE.MathUtils.randFloatSpread(15), Math.random() * 6, 6 - Math.random() * 92], i * 3);
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 500 }, uTime: { value: 0 }, uFog: { value: 0.05 }, uGlow: { value: 1 } },
    vertexShader: /* glsl */ `
      ${POINT_HEAD}
      attribute vec4 aSeed;
      varying float vA;
      void main(){
        float t = uTime * (.08 + aSeed.x * .12);
        vec3 p = position;
        p.y = mod(position.y + t * 1.6, 6.2) - .1;
        p.x += sin(t * 2. + aSeed.y * 6.28) * .35;
        p.z += cos(t * 1.7 + aSeed.z * 6.28) * .35;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uK * (.012 + aSeed.w * .03) / -mv.z;
        vA = (.45 + .55 * sin(uTime * (1.5 + aSeed.y * 3.) + aSeed.z * 40.)) * smoothstep(0., .6, p.y) * smoothstep(6.1, 4.8, p.y);
        ${fogOut}
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGlow;
      varying float vA; varying float vFog;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d);
        gl_FragColor = vec4(vec3(2.4, 1.15, .35) * a * a * vA * vFog * uGlow, 1.);
      }`,
  });
  return new THREE.Points(g, m);
}

/* ---------- Lattice: noise that settles into a neural network ---------- */
export function lattice(count: number) {
  const noise = new Float32Array(count * 3);
  const lat = new Float32Array(count * 3);
  const extra = new Float32Array(count * 4); // x: stagger, y: size, z: edge t (-1 = neuron), w: phase
  const L = 5, G = 5, sx = 2.8, syz = 1.45;
  const neuron = (l: number, i: number, j: number) => [-sx + (2 * sx * l) / (L - 1), -syz + (2 * syz * i) / (G - 1), -syz + (2 * syz * j) / (G - 1)];
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const pick = (l: number) => neuron(l, (Math.random() * G) | 0, (Math.random() * G) | 0);
  // a fixed set of edges so the beams read as wiring, not fog
  const edges: number[][][] = [];
  for (let l = 0; l < L - 1; l++) for (let e = 0; e < 70; e++) edges.push([pick(l), pick(l + 1)]);
  for (let p = 0; p < count; p++) {
    const r = 2.2 + Math.abs(gauss()) * 3.4, th = Math.random() * Math.PI * 2, ph = Math.acos(THREE.MathUtils.randFloat(-1, 1));
    noise.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.75, r * Math.sin(ph) * Math.sin(th)], p * 3);
    let t = -1;
    if (Math.random() < 0.3) {
      const a = pick((Math.random() * L) | 0);
      lat.set([a[0] + gauss() * 0.06, a[1] + gauss() * 0.06, a[2] + gauss() * 0.06], p * 3);
    } else {
      const [a, b] = edges[(Math.random() * edges.length) | 0];
      t = Math.random();
      lat.set([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], p * 3);
    }
    extra.set([Math.random(), Math.random(), t, Math.random()], p * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(noise, 3));
  g.setAttribute('aLat', new THREE.BufferAttribute(lat, 3));
  g.setAttribute('aX', new THREE.BufferAttribute(extra, 4));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 500 }, uTime: { value: 0 }, uFog: { value: 0.05 }, uMorph: { value: 0 }, uVis: { value: 0 } },
    vertexShader: /* glsl */ `
      ${POINT_HEAD}
      uniform float uMorph, uVis;
      attribute vec3 aLat; attribute vec4 aX;
      varying vec3 vCol; varying float vA;
      void main(){
        float s = smoothstep(0., 1., clamp((uMorph - aX.x * .45) / .55, 0., 1.));
        vec3 n = position * (.35 + .65 * uVis);
        n += .14 * vec3(sin(uTime * .6 + aX.w * 6.28), cos(uTime * .5 + aX.w * 9.), sin(uTime * .4 + aX.w * 3.));
        vec3 l = aLat + .012 * vec3(0., sin(uTime + aX.w * 20.), cos(uTime + aX.w * 20.));
        vec3 p = mix(n, l, s);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        // a pulse of light travels along each wire, layer to layer
        float pulse = aX.z < 0. ? .0 : smoothstep(.9, 1., fract(aX.z - uTime * .35 + aX.w * .15)) * s;
        gl_PointSize = uK * (.011 + aX.y * .014) * (1. + pulse * 1.4) / -mv.z;
        vec3 dust = vec3(.9, .72, .5);
        vec3 gold = vec3(1., .66, .16);
        vCol = mix(dust * .6, aX.z < 0. ? vec3(1.2, .9, .5) : gold * .8, s) * (1. + pulse * 3.);
        vA = uVis * mix(.55, .9, s);
        ${fogOut}
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA; varying float vFog;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .05, d);
        gl_FragColor = vec4(vCol * a * vA * vFog, 1.);
      }`,
  });
  return new THREE.Points(g, m);
}

/* ---------- Tablets: glass ledger pages with a gold numeral inside ---------- */
export function tabletGlass() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xfff1dc, metalness: 0, roughness: 0.12, transmission: 1, thickness: 0.55, ior: 1.48,
    attenuationColor: new THREE.Color(0xffc477), attenuationDistance: 1.6, clearcoat: 1, clearcoatRoughness: 0.08,
    specularIntensity: 1, envMapIntensity: 1.3,
  });
}
export function tabletGeometry() {
  return new RoundedBoxGeometry(1.3, 1.8, 0.28, 3, 0.07);
}
export function glyphTexture(week: number, numeral: string, title: string) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 704;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = '500 30px JBMono, monospace';
  try { (g as any).letterSpacing = '6px'; } catch {}
  g.fillText(`WEEK ${String(week).padStart(2, '0')}`, 256, 74);
  try { (g as any).letterSpacing = '0px'; } catch {}
  g.fillRect(110, 100, 292, 4);
  g.font = '400 360px "Tiro Deva", serif';
  g.fillText(numeral, 256, 452);
  g.fillRect(110, 506, 292, 4);
  g.font = '400 48px Fraunces, serif';
  const words = title.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > 420 && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => g.fillText(l, 256, 582 + i * 58));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ---------- Floor: a dark ledger page, ruled, lit by the lamps ---------- */
export function floor() {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uFog: { value: 0.05 }, uFogColor: { value: COLORS.ground.clone() }, uTime: { value: 0 },
      uLamp: { value: new THREE.Vector3() }, uLampI: { value: 0 },
      uField: { value: new THREE.Vector3() }, uFieldI: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW; varying float vD;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.);
        vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vD = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFog, uLampI, uFieldI, uTime;
      uniform vec3 uFogColor, uLamp, uField;
      varying vec3 vW; varying float vD;
      float rule(float v, float every){
        float q = v / every;
        float g = abs(fract(q - .5) - .5) / max(fwidth(q), 1e-4);
        return 1. - min(g, 1.);
      }
      void main(){
        vec3 col = vec3(.03, .022, .017);
        // ledger ruling: faint gold lines across, a red double margin and two amount columns along
        float lines = rule(vW.z, .8) * .05;
        float margin = (1. - min(abs(vW.x + 3.) / max(fwidth(vW.x), 1e-4), 1.)) + (1. - min(abs(vW.x + 2.82) / max(fwidth(vW.x), 1e-4), 1.));
        float cols = (1. - min(abs(vW.x - 3.6) / max(fwidth(vW.x), 1e-4), 1.)) + (1. - min(abs(vW.x - 4.6) / max(fwidth(vW.x), 1e-4), 1.));
        col += vec3(.95, .66, .25) * lines + vec3(.75, .12, .05) * margin * .16 + vec3(.95, .66, .25) * cols * .035;
        float dl = distance(vW.xz, uLamp.xz);
        col += vec3(1., .5, .16) * uLampI * .5 / (1. + dl * dl * 5.);
        float df = distance(vW.xz, uField.xz);
        col += vec3(1., .52, .18) * uFieldI * .1 * smoothstep(8., 0., df);
        float f = exp(-pow(uFog * vD, 2.));
        gl_FragColor = vec4(mix(uFogColor, col, f), 1.);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0, -40);
  return mesh;
}

/* ---------- Contact shadow under objects ---------- */
let shadowTex: THREE.Texture | null = null;
export function contactShadow(w: number, d: number, opacity = 0.75) {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  return m;
}

/* ---------- Halo: a soft glow card behind the knot ---------- */
export function halo(size: number, color = new THREE.Color(1, 0.55, 0.2), strength = 0.5) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: color }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
      void main(){ float d = length(vUv - .5) * 2.; gl_FragColor = vec4(uColor * pow(max(0., 1. - d), 2.6) * uStrength, 1.); }`,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
}

/* ---------- Field of lamps: rings of clay diyas around a rangoli ---------- */
export const RINGS = [
  { r: 1.3, n: 8 }, { r: 2.35, n: 14 }, { r: 3.4, n: 20 }, { r: 4.45, n: 26 }, { r: 5.5, n: 32 },
];
export function fieldFlames(center: THREE.Vector3, scale: number) {
  const pos: number[] = [];
  const meta: number[] = [];
  const mats: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(scale, scale, scale);
  RINGS.forEach(({ r, n }, ri) => {
    for (let k = 0; k < n; k++) {
      const th = (k / n) * Math.PI * 2 + ri * 0.21;
      const x = center.x + Math.cos(th) * r, z = center.z + Math.sin(th) * r;
      // spout points outward, away from the centre
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -th);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q, s));
      const tip = SPOUT.clone().multiplyScalar(scale).applyQuaternion(q);
      pos.push(x + tip.x, tip.y, z + tip.z);
      meta.push(ri, Math.random());
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aMeta', new THREE.Float32BufferAttribute(meta, 2));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 500 }, uTime: { value: 0 }, uFog: { value: 0.05 }, uLit: { value: 0 } },
    vertexShader: /* glsl */ `
      ${POINT_HEAD}
      uniform float uLit;
      attribute vec2 aMeta;
      varying float vLit; varying float vSeed;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position + vec3(0., .07, 0.), 1.);
        gl_Position = projectionMatrix * mv;
        vLit = smoothstep(aMeta.x * .16, aMeta.x * .16 + .22, uLit);
        vSeed = aMeta.y;
        gl_PointSize = uK * .3 * vLit / -mv.z;
        ${fogOut}
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying float vLit; varying float vSeed; varying float vFog;
      void main(){
        vec2 p = gl_PointCoord; p.y = 1. - p.y;
        float x = (p.x - .5) * 2.;
        float y = p.y;
        float flick = sin(uTime * 9. + vSeed * 30.) * .03 + sin(uTime * 23. + vSeed * 11.) * .02;
        x -= flick * y * 2.;
        float w = y < .3 ? sqrt(max(0., 1. - pow((.3 - y) / .3, 2.))) : pow(max(0., 1. - (y - .3) / .62), 1.2);
        float d = abs(x) / max(w * .34, 1e-3);
        float body = smoothstep(1., .5, d) * step(y, .92);
        float core = smoothstep(.8, 0., d) * smoothstep(.6, .15, y);
        vec3 col = mix(vec3(1., .34, .06), vec3(1., .74, .28), 1. - d);
        col = mix(col, vec3(1., .95, .85), core);
        float glow = exp(-dot(vec2(x, (y - .3) * 1.4), vec2(x, (y - .3) * 1.4)) * 3.) * .25;
        gl_FragColor = vec4((col * body * 3. + vec3(1., .5, .15) * glow) * vLit * vFog, 1.);
      }`,
  });
  return { points: new THREE.Points(g, m), matrices: mats };
}

export function rangoli(center: THREE.Vector3, count: number) {
  const pos: number[] = [];
  const col: number[] = [];
  const pal = [
    new THREE.Color(0.95, 0.5, 0.04), // marigold
    new THREE.Color(0.66, 0.1, 0.05), // sindoor
    new THREE.Color(0.95, 0.78, 0.22), // turmeric
    new THREE.Color(0.93, 0.88, 0.8), // rice flour white
  ];
  let made = 0, guard = 0;
  while (made < count && guard++ < count * 6) {
    const r = Math.sqrt(Math.random()) * 6.1;
    const th = Math.random() * Math.PI * 2;
    const petals = Math.abs(Math.sin(4 * th + r * 0.6));
    const band = r * 1.35 + 0.55 * petals;
    const fr = band - Math.floor(band);
    if (fr < 0.1) continue; // dark gaps between bands read as drawn lines
    let ci = Math.floor(band) % 4;
    if (r < 0.75) ci = Math.cos(8 * th) > 0.1 - r * 0.4 ? 1 : 2;
    pos.push(center.x + Math.cos(th) * r, 0.012, center.z + Math.sin(th) * r);
    const c = pal[ci];
    col.push(c.r, c.g, c.b);
    made++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uK: { value: 500 }, uTime: { value: 0 }, uFog: { value: 0.05 }, uReveal: { value: 0 }, uCenter: { value: center.clone() }, uLight: { value: 0 } },
    vertexShader: /* glsl */ `
      ${POINT_HEAD}
      uniform float uReveal, uLight; uniform vec3 uCenter;
      attribute vec3 color;
      varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * mv;
        float r = distance(position.xz, uCenter.xz);
        vA = smoothstep(uReveal * 6.6, uReveal * 6.6 - .5, r);
        gl_PointSize = uK * .1 / -mv.z;
        vC = color * (.35 + .65 * uLight);
        ${fogOut}
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA; varying float vFog;
      void main(){
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        gl_FragColor = vec4(vC, vA * vFog * smoothstep(.5, .25, d));
      }`,
  });
  return new THREE.Points(g, m);
}
