// The ShubhLabh world: one Three.js scene the camera travels through as the page scrolls.
// Station value c: 0 lamp, 1 noise, 2 structure, 3..10 weeks 1..8, 11 gain, 12 the lamp field.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as P from './parts';
import { modules, deva } from '../../data/site';

const UP = new THREE.Vector3(0, 1, 0);
const LAMP = new THREE.Vector3(0, 0, 0);
const LAT = new THREE.Vector3(0, 2.4, -13);
const TAB = (i: number) => new THREE.Vector3(Math.sin(i * 0.8) * 0.9, 0.97, -24 - 3.4 * i);
const KNOT = new THREE.Vector3(0, 2.5, -58);
const FIELD = new THREE.Vector3(0, 0, -77);
const FOG = 0.05;

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uCA: { value: 0.0024 }, uVig: { value: 0.85 }, uGrain: { value: 0.045 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uCA, uVig, uGrain; uniform vec2 uRes;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - .5;
      vec2 off = c * dot(c, c) * uCA * 8.;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col *= mix(1., smoothstep(.95, .25, length(c * vec2(1., .92)) * 1.15), uVig);
      col += (h(vUv * uRes + fract(uTime * 7.) * 91.7) - .5) * uGrain;
      gl_FragColor = vec4(col, 1.);
    }`,
};

type Key = { cam: THREE.Vector3; focus: THREE.Vector3; ox: number; oy: number; fov: number };

export type World = ReturnType<typeof createWorld>;

export function createWorld(host: HTMLElement) {
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.3 : 1.6);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ('transmissionResolutionScale' in renderer) (renderer as any).transmissionResolutionScale = mobile ? 0.5 : 0.75;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = P.COLORS.ground.clone();
  scene.fog = new THREE.FogExp2(P.COLORS.ground.getHex(), FOG);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 120);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04, 0.1, 100, { size: 128 }).texture;
  scene.environmentIntensity = 0.4;
  scene.add(new THREE.HemisphereLight(0x4a3424, 0x080604, 0.5));

  /* Floor */
  const floor = P.floor();
  scene.add(floor);
  const fu = (floor.material as THREE.ShaderMaterial).uniforms;
  fu.uLamp.value.copy(LAMP);
  fu.uField.value.copy(FIELD);

  /* Station 0: the brass diya */
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc8943c, metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
  const diya = new THREE.Group();
  diya.position.copy(LAMP);
  diya.rotation.y = -0.55;
  diya.scale.setScalar(1.15);
  diya.add(new THREE.Mesh(P.diyaGeometry(mobile ? 40 : 64), brass));
  const oil = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 48),
    new THREE.MeshStandardMaterial({ color: 0x1c0d03, roughness: 0.22, metalness: 0, envMapIntensity: 0.12 }),
  );
  oil.rotation.x = -Math.PI / 2;
  oil.position.y = 0.17;
  diya.add(oil);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 1 }));
  wick.position.copy(P.SPOUT).add(new THREE.Vector3(-0.04, -0.03, 0));
  wick.rotation.z = -0.9;
  diya.add(wick);
  const flameMat = P.flameMaterial(0.3);
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMat);
  flame.position.copy(P.SPOUT);
  flame.frustumCulled = false;
  diya.add(flame);
  const flameLight = new THREE.PointLight(0xff9a40, 0, 7, 2);
  flameLight.position.copy(P.SPOUT).add(new THREE.Vector3(0, 0.14, 0));
  diya.add(flameLight);
  const diyaShadow = P.contactShadow(1.6, 1.2, 0.85);
  diyaShadow.position.x = 0.05;
  scene.add(diya, diyaShadow);

  /* Global embers */
  const embers = P.embers(mobile ? 650 : 1400);
  embers.frustumCulled = false;
  scene.add(embers);

  /* Stations 1-2: noise into structure */
  const lattice = P.lattice(mobile ? 4500 : 9000);
  lattice.position.copy(LAT);
  lattice.frustumCulled = false;
  scene.add(lattice);

  /* Stations 3-10: glass ledger tablets */
  const glass = P.tabletGlass();
  const tabGeo = P.tabletGeometry();
  const footGeo = new THREE.BoxGeometry(1.42, 0.07, 0.42);
  const tablets = modules.map((m, i) => {
    const g = new THREE.Group();
    const p = TAB(i);
    g.position.set(p.x, 0, p.z);
    const base = -0.42 + Math.sin(i * 0.8 + 0.6) * 0.12;
    g.rotation.y = base;
    const slab = new THREE.Mesh(tabGeo, glass);
    slab.position.y = p.y;
    const glyphMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.66, 0.24), alphaTest: 0.5, side: THREE.DoubleSide });
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.54), glyphMat);
    glyph.position.y = p.y;
    const foot = new THREE.Mesh(footGeo, brass);
    foot.position.y = 0.035;
    const sh = P.contactShadow(2.0, 0.9, 0.8);
    g.add(slab, glyph, foot, sh);
    scene.add(g);
    return { g, glyph, glyphMat, base, week: m.week, title: m.title };
  });

  /* Station 11: the gold endless knot */
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe9ad3f, metalness: 1, roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.8 });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.0, 0.3, mobile ? 220 : 360, mobile ? 32 : 48, 2, 3), gold);
  knot.position.copy(KNOT);
  const knotHalo = P.halo(9, new THREE.Color(1, 0.5, 0.16), 0.18);
  knotHalo.position.copy(KNOT).add(new THREE.Vector3(0, 0, -1.6));
  const knotShadow = P.contactShadow(4.2, 4.2, 0.55);
  knotShadow.position.set(KNOT.x, 0.004, KNOT.z);
  const key = new THREE.DirectionalLight(0xffd7a0, 1.2);
  key.position.copy(KNOT).add(new THREE.Vector3(-4, 6, 3));
  key.target.position.copy(KNOT);
  const rim = new THREE.PointLight(0xff6a2a, 10, 12, 2);
  rim.position.copy(KNOT).add(new THREE.Vector3(2.5, 1.5, -2.5));
  scene.add(knot, knotHalo, knotShadow, key, key.target, rim);

  /* Station 12: the field of lamps around a rangoli */
  const clay = new THREE.MeshStandardMaterial({ color: 0x8a3a1c, roughness: 0.8, side: THREE.DoubleSide });
  const ff = P.fieldFlames(FIELD, 0.5);
  const field = new THREE.InstancedMesh(P.diyaGeometry(mobile ? 18 : 28), clay, ff.matrices.length);
  ff.matrices.forEach((m, i) => field.setMatrixAt(i, m));
  ff.points.frustumCulled = false;
  const rangoli = P.rangoli(FIELD, mobile ? 7000 : 14000);
  rangoli.frustumCulled = false;
  const fieldLight = new THREE.PointLight(0xffa04a, 0, 14, 1.6);
  fieldLight.position.copy(FIELD).add(new THREE.Vector3(0, 1.6, 0));
  scene.add(field, ff.points, rangoli, fieldLight);

  const pointMats = [embers, lattice, ff.points, rangoli].map((o) => (o.material as THREE.ShaderMaterial).uniforms);

  /* Post-processing: bloom, then tone map, then grain, vignette and a little lens fringe */
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), mobile ? 0.65 : 0.72, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fin = new ShaderPass(FinalShader);
  composer.addPass(fin);

  /* Camera rig: one curve through every station */
  let keys: Key[] = [];
  let posCurve: THREE.CatmullRomCurve3, tgtCurve: THREE.CatmullRomCurve3, fovs: number[] = [];
  function aim(k: Key, aspect: number) {
    const dir = k.focus.clone().sub(k.cam);
    const dist = dir.length();
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const th = Math.tan(THREE.MathUtils.degToRad(k.fov / 2));
    return k.focus.clone().addScaledVector(right, -k.ox * dist * th * aspect).addScaledVector(up, -k.oy * dist * th);
  }
  function buildRig(aspect: number) {
    const portrait = aspect < 0.85;
    const ox = portrait ? 0 : 0.36, oy = portrait ? 0.24 : 0;
    const pull = portrait ? 1.5 : 1;
    const K = (cam: number[], focus: THREE.Vector3, fov: number, dx = 0, dy = 0): Key => {
      const c = new THREE.Vector3(...(cam as [number, number, number]));
      c.sub(focus).multiplyScalar(pull).add(focus);
      return { cam: c, focus, ox: ox + (portrait ? 0 : dx), oy: oy + dy, fov: portrait ? fov + 6 : fov };
    };
    keys = [
      K([-1.0, 1.15, 4.5], new THREE.Vector3(0.15, 0.3, 0), 34, -0.05, -0.05),
      K([2.9, 2.7, -5.3], LAT, 40),
      K([-4.4, 3.5, -8.9], LAT, 40),
      ...modules.map((_, i) => {
        const t = TAB(i);
        return K([t.x - 1.75, t.y + 0.38, t.z + 3.2], t.clone().add(new THREE.Vector3(0, 0.04, 0)), 36, -0.02);
      }),
      K([-2.3, 2.9, -51.3], KNOT, 38, -0.02),
      K([0.4, 8.6, -64.4], FIELD.clone().add(new THREE.Vector3(0, 0, -0.4)), 40, 0.05),
    ];
    posCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.cam), false, 'centripetal');
    tgtCurve = new THREE.CatmullRomCurve3(keys.map((k) => aim(k, aspect)), false, 'centripetal');
    fovs = keys.map((k) => k.fov);
  }

  const state = { intro: 0, px: 0, py: 0, tx: 0, ty: 0, sway: 0, lastPx: 0, active: true, w: 1, h: 1 };
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  const tmpDir = new THREE.Vector3(), tmpRight = new THREE.Vector3(), tmpUp = new THREE.Vector3();

  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    state.w = w; state.h = h;
    renderer.setSize(w, h);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    buildRig(w / h);
    fin.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  resize();

  const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);

  function update(c: number, t: number) {
    const N = keys.length;
    const k = Math.min(N - 2, Math.max(0, Math.floor(c)));
    const f = THREE.MathUtils.clamp(c - k, 0, 1);
    const e = f * f * (3 - 2 * f);
    const u = (k + e) / (N - 1);
    posCurve.getPoint(u, camPos);
    tgtCurve.getPoint(u, camTgt);
    camera.fov = THREE.MathUtils.lerp(fovs[k], fovs[k + 1], e);

    // pointer parallax (lagged), idle breathing and the intro dolly
    state.px += (state.tx - state.px) * 0.05;
    state.py += (state.ty - state.py) * 0.05;
    tmpDir.copy(camTgt).sub(camPos).normalize();
    tmpRight.crossVectors(tmpDir, UP).normalize();
    tmpUp.crossVectors(tmpRight, tmpDir).normalize();
    camPos.addScaledVector(tmpRight, state.px * 0.16 + Math.sin(t * 0.37) * 0.02);
    camPos.addScaledVector(tmpUp, -state.py * 0.1 + Math.sin(t * 0.6) * 0.015);
    const back = 1 - state.intro;
    camPos.addScaledVector(tmpDir, -back * 1.6).addScaledVector(UP, back * 0.35);
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    camera.updateProjectionMatrix();

    const K = (state.h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    for (const uni of pointMats) { uni.uK.value = K; uni.uTime.value = t; uni.uFog.value = FOG; }
    fu.uTime.value = t;

    // lamp
    const flick = 0.86 + 0.08 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.7 + 1.3);
    const ignite = smooth(0, 0.35, state.intro) * (state.intro < 0.25 ? 0.6 + 0.4 * Math.sin(t * 40) : 1);
    flameMat.uniforms.uTime.value = t;
    flameMat.uniforms.uIntensity.value = ignite * flick;
    const v = state.px - state.lastPx;
    state.lastPx = state.px;
    state.sway += (THREE.MathUtils.clamp(-v * 40, -1, 1) - state.sway) * 0.08;
    flameMat.uniforms.uSway.value = state.sway;
    flameLight.intensity = 2.4 * ignite * flick;
    fu.uLampI.value = ignite * flick;
    diya.visible = diyaShadow.visible = c < 3.2;

    // noise into structure
    const lu = (lattice.material as THREE.ShaderMaterial).uniforms;
    lu.uVis.value = smooth(0.1, 0.95, c) * (1 - smooth(3.1, 3.9, c));
    lu.uMorph.value = smooth(1.05, 1.95, c);
    lattice.rotation.y = t * 0.05 + c * 0.32;
    lattice.rotation.x = 0.12 + Math.sin(t * 0.2) * 0.04;
    lattice.visible = lu.uVis.value > 0.002;

    // tablets: the week in front of the camera glows, the rest wait in the dark
    const a = c - 3;
    tablets.forEach((tb, i) => {
      const focus = THREE.MathUtils.clamp(1 - Math.abs(a - i), 0, 1);
      const fe = focus * focus * (3 - 2 * focus);
      tb.glyphMat.color.setRGB(1, 0.62, 0.22).multiplyScalar(0.3 + 2.6 * fe);
      tb.g.rotation.y = tb.base + (1 - fe) * 0.18 + Math.sin(t * 0.5 + i) * 0.015;
      tb.g.position.y = Math.sin(t * 0.8 + i * 1.7) * 0.012 * fe;
      tb.g.visible = c > 1.4 && c < 11.7;
    });

    // knot
    knot.rotation.set(t * 0.11 + c * 0.25, t * 0.17 + c * 0.4, 0.3);
    knot.position.y = KNOT.y + Math.sin(t * 0.7) * 0.05;
    knotHalo.quaternion.copy(camera.quaternion);
    const kv = c > 8.5 && c < 12.6;
    knot.visible = knotHalo.visible = knotShadow.visible = kv;

    // field: the rangoli is drawn outward, then the lamps light ring by ring
    const lit = smooth(11.35, 12, c);
    const ru = (rangoli.material as THREE.ShaderMaterial).uniforms;
    ru.uReveal.value = smooth(11.05, 11.85, c);
    ru.uLight.value = lit;
    (ff.points.material as THREE.ShaderMaterial).uniforms.uLit.value = lit * 1.02;
    fieldLight.intensity = 9 * lit;
    fu.uFieldI.value = lit;
    const fv = c > 9.8;
    field.visible = ff.points.visible = rangoli.visible = fv;

    fin.uniforms.uTime.value = t;
  }

  return {
    mobile,
    renderer,
    get active() { return state.active; },
    setActive(on: boolean) { state.active = on; },
    setPointer(x: number, y: number) { state.tx = x; state.ty = y; },
    setIntro(v: number) { state.intro = v; },
    resize,
    update,
    render() { if (state.active) composer.render(); },
    // compile one station at a time in the background so none stutters when it first appears
    warm() {
      const groups: THREE.Object3D[] = [lattice, tablets[0].g, knot, knotHalo, field, ff.points, rangoli];
      const next = () => {
        const g = groups.shift();
        if (!g) return;
        const was = g.visible;
        g.visible = true;
        g.traverse((o) => (o.visible = true));
        try { renderer.compile(g, camera, scene); } catch {}
        g.visible = was;
        window.setTimeout(next, 120);
      };
      window.setTimeout(next, 200);
    },
    async init(progress: (p: number) => void) {
      progress(0.08);
      try {
        await Promise.all([
          document.fonts.load('360px "Tiro Deva"', deva(1)),
          document.fonts.load('48px Fraunces'),
          document.fonts.load('500 30px JBMono'),
        ]);
      } catch {}
      progress(0.35);
      tablets.forEach((tb, i) => {
        tb.glyphMat.map = P.glyphTexture(tb.week, deva(tb.week), tb.title);
        tb.glyphMat.needsUpdate = true;
        progress(0.35 + (0.25 * (i + 1)) / tablets.length);
      });
      // compile what the first frame needs now; the other stations warm up after the intro
      update(0, 0);
      renderer.compile(scene, camera);
      progress(0.85);
      composer.render();
      progress(1);
    },
  };
}
