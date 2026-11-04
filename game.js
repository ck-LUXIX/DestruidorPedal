import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/* ================= CONFIGURAÇÃO ================= */
const CFG = {
  maxRev: 28,            // velocidade máx. de ré (m/s) ~100 km/h
  maxFwd: 12,            // velocidade máx. para frente (m/s)
  accel: 13, brake: 34, coast: 3, handbrake: 38,
  steerRate: 1.7,        // sensibilidade da direção
  fwdThreshold: 0.8,     // m/s para frente que ATIVA o contador
  fwdCancel: 0.3,        // abaixo disso o contador é cancelado
  penaltySeconds: 5,     // tempo até explodir
  fatalImpact: 24,       // m/s de impacto que causa acidente fatal
  carRadius: 1.0,
  cams: [{dist: 11, height: 4.2, look: 0}, {dist: 16, height: 7.2, look: 0}],
  model: 'assets/old_rusty_car.glb',
  modelYaw: 0,           // o modelo já tem o comprimento alinhado ao eixo Z
  carLength: 10.5
};

/* ================= FASES COM MAIS OBSTÁCULOS ================= */
const cones = (a, b, n, amp) => Array.from({length: n}, (_, i) => ['c', a + (b - a) * i / (n - 1), (i % 2 ? -1 : 1) * amp]);
const pinch = (u, gap, W) => { const h = (W / 2 - gap / 2) / 2 + .2, l = gap / 2 + (W / 2 - gap / 2) / 2; return [['b', u, l, h], ['b', u, -l, h]]; };

// tipos: c=cone, b=barreira, k=bloco fixo, m=barreira móvel
const LEVELS = [
  {name: 'Aprendizado', w: 18, ramps: [[.52, .57, 1]],
   pts: [[0,-20],[0,40],[0,100],[18,150],[60,175],[110,175],[150,200],[160,250],[135,290],[95,300],[60,330],[60,380],[60,430]],
   obs: [
     ...cones(.05, .12, 6, 3),
     ...cones(.14, .22, 8, 4),
     ['m', .25, 0, 2.5],
     ['b', .28, 5, 3],
     ['b', .34, -5, 3],
     ['k', .38, -3],
     ['k', .42, 3],
     ['m', .48, 0, 2.5],
     ...pinch(.55, 7, 18),
     ...pinch(.64, 6.2, 18),
     ...cones(.68, .74, 5, 3.5),
     ['m', .77, 0, 2.5],
     ['k', .82, -4],
     ['b', .86, 4, 3],
     ['b', .90, -4, 3],
     ...cones(.93, .97, 4, 3)
   ]},
  {name: 'Precisão', w: 13, ramps: [[.55, .6, 1.3]],
   pts: [[0,-20],[0,50],[30,95],[0,140],[-35,185],[-5,230],[40,255],[85,235],[110,270],[95,320],[50,345],[50,400]],
   obs: [
     ...cones(.05, .12, 6, 3.5),
     ['m', .15, 0, 2.2],
     ...cones(.17, .22, 6, 3.5),
     ['b', .23, 3.2, 3.2],
     ['b', .28, -3.2, 3.2],
     ['b', .33, 3.2, 3.2],
     ['m', .38, 0, 2.2],
     ...pinch(.43, 4.5, 13),
     ['k', .5, -3],
     ['k', .54, 3],
     ['m', .58, 0, 2.2],
     ...cones(.62, .68, 6, 3),
     ['k', .72, 3],
     ['k', .76, -3],
     ['b', .79, -3.2, 3.2],
     ['m', .83, 0, 2.2],
     ...pinch(.88, 4.2, 13),
     ...cones(.93, .97, 4, 2.5)
   ]},
  {name: 'Sobrevivência', w: 12, ramps: [[.3, .35, 1.6], [.7, .75, 1.8]],
   pts: [[0,-20],[0,60],[40,100],[90,100],[120,140],[100,185],[55,205],[40,250],[75,290],[130,300],[160,340],[145,390],[100,420],[100,470]],
   obs: [
     ['m', .08, 0, 2.2],
     ...cones(.12, .16, 5, 3),
     ['m', .18, 0, 2.2],
     ...cones(.22, .27, 5, 3),
     ['m', .31, 0, 2.2],
     ...pinch(.36, 4.0, 12),
     ...pinch(.42, 3.8, 12),
     ['m', .46, 0, 2.2],
     ['m', .5, 0, 2.2],
     ['m', .57, 0, 2.2],
     ['k', .63, -3],
     ['k', .67, 3],
     ['m', .72, 0, 2.2],
     ['b', .77, 3, 3],
     ['b', .81, -3, 3],
     ['m', .85, 0, 2.2],
     ...cones(.88, .92, 5, 3),
     ['m', .95, 0, 2.2]
   ]}
 ];

// Fase 4: pista procedural muito longa, com curvas alternadas e obstáculos distribuídos.
// É uma sobrevivência de duração extrema (vários quilômetros de pista).
{
  const pts = [];
  // Mais curta que a versão anterior, mas com curvas mais rápidas e alternadas.
  // O comprimento total fica em torno de 4,5 km, evitando uma fase excessivamente longa.
  for (let i = 0; i <= 180; i++) {
    const z = -20 + i * 25;
    const x = 31 * Math.sin(i * 0.235) + 14 * Math.sin(i * 0.56) + 6 * Math.sin(i * 1.02);
    pts.push([x, z]);
  }
  const obs = [];
  for (let i = 7; i < 177; i += 2) {
    const u = i / 180;
    const side = (Math.floor(i / 2) % 2 === 0) ? -1 : 1;
    // Barreiras alternadas estreitam a passagem, mas deixam uma rota possível.
    obs.push(['b', u, side * 4.05, 1.25]);
    obs.push(['b', u, -side * 4.05, 1.25]);
    if (i % 3 === 0) obs.push(['c', Math.min(.985, u + .006), side * 1.25]);
    if (i % 4 === 1) obs.push(['k', Math.min(.985, u + .01), -side * 2.0]);
  }
  LEVELS.push({name: 'Infinita — Curvas Insanas', w: 16, ramps: [], pts, obs, endless: true});
}

/* ================= UTILIDADES ================= */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const ls = {get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }};
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0'); };
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const mkTex = (draw, w = 128, h = 128) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return t; };

/* ================= CENA ================= */
const renderer = new THREE.WebGLRenderer({canvas: $('c'), antialias: true});
// Limita a resolução interna para aliviar GPU sem alterar a resolução da janela.
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec5ff);
scene.fog = new THREE.Fog(0x8ec5ff, 80, 380);
const camera = new THREE.PerspectiveCamera(62, 1, .1, 1500);
scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x445533, 1.1));
const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200});
sun.shadow.bias = -.0004;
scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({color: 0x3b6b45, roughness: 1}));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.05; ground.receiveShadow = true; scene.add(ground);
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ================= CARRO ================= */
const carRoot = new THREE.Group(); scene.add(carRoot);
let wheels = [];

function splitWheels(root) {
  let wm; root.traverse(o => { if (o.isMesh && /wheel/i.test(o.name)) wm = o; });
  if (!wm) return [];
  const g = wm.geometry.index ? wm.geometry.toNonIndexed() : wm.geometry;
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  g.computeBoundingBox();
  const zm = (g.boundingBox.min.z + g.boundingBox.max.z) / 2, B = [0, 1, 2, 3].map(() => ({p: [], n: [], u: []}));
  for (let i = 0; i < P.count; i += 3) {
    const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
    const b = B[(cx > 0 ? 1 : 0) + (cz > zm ? 2 : 0)];
    for (let j = 0; j < 3; j++) {
      b.p.push(P.getX(i + j), P.getY(i + j), P.getZ(i + j));
      if (N) b.n.push(N.getX(i + j), N.getY(i + j), N.getZ(i + j));
      if (U) b.u.push(U.getX(i + j), U.getY(i + j));
    }
  }
  const out = [];
  B.forEach((b, k) => {
    if (!b.p.length) return;
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
    if (b.n.length) gg.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); else gg.computeVertexNormals();
    if (b.u.length) gg.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
    gg.computeBoundingBox();
    const c = gg.boundingBox.getCenter(new THREE.Vector3());
    gg.translate(-c.x, -c.y, -c.z);
    const mesh = new THREE.Mesh(gg, wm.material), piv = new THREE.Group();
    piv.position.copy(c); piv.add(mesh); wm.parent.add(piv);
    out.push({piv, spin: mesh, front: k >= 2, r: (gg.boundingBox.max.y - gg.boundingBox.min.y) / 2});
  });
  wm.visible = false;
  return out;
}


/* ================= DETALHES VISUAIS DO CARRO =================
   Acessórios extras sem mudar a orientação nem a física do veículo. */
function addCarDecorations(parent) {
  const decor = new THREE.Group();
  decor.name = 'carDecorations';
  // Os acessórios ficam no mesmo grupo local do modelo para acompanhar sua rotação, escala e centralização.

  const mat = (color, metalness = 0.35, roughness = 0.3, emissive = 0x000000) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: 0.65 });
  const red = mat(0xff1838, 0.45, 0.25, 0x5a0010);
  const black = mat(0x10131a, 0.55, 0.32);
  const chrome = mat(0xcbd5e1, 0.8, 0.22);
  const gold = mat(0xffc247, 0.65, 0.25, 0x4d2600);
  const glowRed = new THREE.MeshStandardMaterial({color: 0xff263f, emissive: 0xff001e, emissiveIntensity: 2.2, roughness: 0.2});
  const glowBlue = new THREE.MeshStandardMaterial({color: 0x37d8ff, emissive: 0x009dff, emissiveIntensity: 1.8, roughness: 0.2});

  function piece(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    decor.add(mesh);
    return mesh;
  }

  // Spoiler esportivo com suportes.
  piece(new THREE.BoxGeometry(1.55, 0.09, 0.22), black, 0, 1.0, 1.72);
  piece(new THREE.BoxGeometry(1.32, 0.055, 0.16), red, 0, 1.06, 1.72);
  for (const x of [-0.48, 0.48]) piece(new THREE.BoxGeometry(0.07, 0.28, 0.09), chrome, x, 0.87, 1.68);

  // Faixas esportivas no capô/teto e detalhes laterais.
  piece(new THREE.BoxGeometry(0.075, 0.018, 2.55), gold, -0.13, 0.88, -0.05);
  piece(new THREE.BoxGeometry(0.075, 0.018, 2.55), gold, 0.13, 0.88, -0.05);
  for (const x of [-0.91, 0.91]) {
    piece(new THREE.BoxGeometry(0.12, 0.13, 2.45), black, x, 0.39, 0);
    piece(new THREE.BoxGeometry(0.035, 0.045, 2.15), glowBlue, x * 1.035, 0.43, 0);
  }

  // Para-choques reforçados, lanternas e escapamentos nas duas extremidades.
  for (const z of [-1.88, 1.88]) {
    piece(new THREE.BoxGeometry(1.55, 0.16, 0.16), black, 0, 0.34, z);
    for (const x of [-0.57, 0.57]) {
      piece(new THREE.BoxGeometry(0.28, 0.12, 0.045), glowRed, x, 0.62, z * 0.99);
      piece(new THREE.CylinderGeometry(0.075, 0.09, 0.13, 12), chrome, x * 0.72, 0.29, z * 1.03, Math.PI / 2, 0, 0);
    }
  }

  // Pequenos faróis auxiliares e emblema decorativo.
  for (const x of [-0.52, 0.52]) {
    piece(new THREE.SphereGeometry(0.075, 12, 8), glowBlue, x, 0.56, -1.9);
  }
  piece(new THREE.BoxGeometry(0.24, 0.045, 0.035), gold, 0, 0.62, 1.96);
  parent.add(decor);
}

async function loadCar() {
  try {
    const gltf = await new GLTFLoader().loadAsync(CFG.model);
    const raw = gltf.scene, ws = splitWheels(raw);
    const yawG = new THREE.Group(); yawG.add(raw); yawG.rotation.y = CFG.modelYaw;
    const sg = new THREE.Group(); sg.add(yawG);
    let box = new THREE.Box3().setFromObject(sg);
    const k = CFG.carLength / (box.max.z - box.min.z);
    sg.scale.setScalar(k);
    box = new THREE.Box3().setFromObject(sg);
    const c = box.getCenter(new THREE.Vector3());
    sg.position.set(-c.x, -box.min.y, -c.z);
    sg.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    wheels = ws.map(w => ({...w, r: w.r * k}));
    carRoot.add(sg);
  } catch (e) {
    console.warn('GLB indisponível, usando carro provisório:', e);
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({color: 0xe53935, metalness: .5, roughness: .35});
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, .6, 4.2), m); b.position.y = .65;
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.5, .5, 2), new THREE.MeshStandardMaterial({color: 0x222233})); c.position.set(0, 1.15, -.3);
    g.add(b, c); b.castShadow = c.castShadow = true;
    for (const [x, z] of [[-.95, 1.3], [.95, 1.3], [-.95, -1.3], [.95, -1.3]]) {
      const piv = new THREE.Group(), spin = new THREE.Group();
      const w = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .3, 16), new THREE.MeshStandardMaterial({color: 0x111111}));
      w.rotation.z = Math.PI / 2; w.castShadow = true; spin.add(w); piv.add(spin); piv.position.set(x, .35, z); g.add(piv);
      wheels.push({piv, spin, front: z > 0, r: .35});
    }
    carRoot.add(g);
  }
}

/* ================= PARTÍCULAS / EFEITOS ================= */
const PN = 700, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pBase = new Float32Array(PN * 3);
const pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN).fill(1); let pc = 0;
pPos.fill(-999);
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({size: .45, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
points.frustumCulled = false; scene.add(points);
function emit(x, y, z, vx, vy, vz, life, r, g, b) {
  const i = pc++ % PN;
  pPos.set([x, y, z], i * 3); pVel.set([vx, vy, vz], i * 3); pBase.set([r, g, b], i * 3); pLife[i] = pMax[i] = life;
}
function updateParticles(dt) {
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) { pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
    pLife[i] -= dt; pVel[i * 3 + 1] -= 9 * dt;
    for (let k = 0; k < 3; k++) pPos[i * 3 + k] += pVel[i * 3 + k] * dt;
    const f = Math.max(0, pLife[i] / pMax[i]);
    for (let k = 0; k < 3; k++) pCol[i * 3 + k] = pBase[i * 3 + k] * f;
  }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
}
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({color: 0xffa030, transparent: true}));
const boomLight = new THREE.PointLight(0xff8830, 0, 60);
const smokes = Array.from({length: 10}, () => new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({color: 0x222222, transparent: true, opacity: 0})));
fireball.visible = false; scene.add(fireball, boomLight, ...smokes);
smokes.forEach(s => s.visible = false);

/* ================= ÁUDIO ================= */
const A = {ctx: null, vol: +(ls.get('rrVol') ?? .6), mute: ls.get('rrMute') === '1'};
function applyVol() { if (A.master) A.master.gain.value = A.mute ? 0 : A.vol; }
function initAudio() {
  if (A.ctx) { A.ctx.resume && A.ctx.resume(); return; }
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)(); A.ctx = c;
    A.master = c.createGain(); A.master.connect(c.destination);
    A.osc = c.createOscillator(); A.osc.type = 'sawtooth'; A.eg = c.createGain(); A.eg.gain.value = 0;
    A.osc.connect(A.eg).connect(A.master); A.osc.start(); applyVol();
  } catch (e) { A.ctx = null; }
}
function boom(d, g, f) {
  if (!A.ctx) return;
  const c = A.ctx, buf = c.createBuffer(1, Math.max(1, c.sampleRate * d | 0), c.sampleRate), a = buf.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), ga = c.createGain();
  s.buffer = buf; fl.type = 'lowpass'; fl.frequency.value = f; ga.gain.value = g;
  s.connect(fl).connect(ga).connect(A.master); s.start();
}

/* ================= MUNDO / PISTA ================= */
const world = new THREE.Group(); scene.add(world);
let L = null;

function clearWorld() {
  world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (o.material.map) && o.material.map.dispose(); o.material.dispose(); } });
  world.clear();
}

function buildLevel(n) {
  clearWorld();
  const D = LEVELS[n], W = D.w;
  const curve = new THREE.CatmullRomCurve3(D.pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
  const len = curve.getLength(), N = Math.round(len / 2.5), seg = len / N, pts = curve.getSpacedPoints(N);
  const P = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z; const m = Math.hypot(tx, tz); tx /= m; tz /= m;
    const u = i / N; let h = 0;
    for (const [r0, r1, H] of D.ramps) if (u > r0 && u < r1) h += H * Math.sin(Math.PI * (u - r0) / (r1 - r0));
    return {x: p.x, z: p.z, tx, tz, lx: tz, lz: -tx, h};
  });
  const S0 = Math.round(20 / seg), E = N - 8;
  L = {N, W, P, S0, E, seg, walls: [], obs: [], dyn: [], flying: [], cp: [1, 2, 3].map(k => Math.round(S0 + (E - S0) * k / 4)), name: D.name};

  // pista
  const road = new THREE.PlaneGeometry(1, 1);
  const rp = new Float32Array((N + 1) * 6), ru = new Float32Array((N + 1) * 4), ri = [];
  for (let i = 0; i <= N; i++) {
    const p = P[i];
    rp.set([p.x + p.lx * W / 2, p.h + .03, p.z + p.lz * W / 2, p.x - p.lx * W / 2, p.h + .03, p.z - p.lz * W / 2], i * 6);
    ru.set([0, i * seg / 16, 1, i * seg / 16], i * 4);
    if (i < N) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  road.dispose();
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('uv', new THREE.BufferAttribute(ru, 2)); rg.setIndex(ri); rg.computeVertexNormals();
  const rt = mkTex((c, w, h) => {
    c.fillStyle = '#3a3d45'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},.05)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    c.fillStyle = '#fff'; c.fillRect(4, 0, 6, h); c.fillRect(w - 10, 0, 6, h);
    c.fillStyle = '#ffd23d'; c.fillRect(w / 2 - 2, 0, 4, h / 2);
  });
  const roadMesh = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({map: rt, roughness: .9, side: THREE.DoubleSide}));
  roadMesh.receiveShadow = true; world.add(roadMesh);

  // paredes laterais
  const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.1, 1.2), new THREE.MeshStandardMaterial({roughness: .6}), N * 2);
  wm.castShadow = wm.receiveShadow = true;
  const dm = new THREE.Object3D(), red = new THREE.Color(0xd62828), wht = new THREE.Color(0xf2f2f2), off = W / 2 + .6;
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[i + 1], pair = [];
    [1, -1].forEach((sd, j) => {
      const ax = a.x + a.lx * off * sd, az = a.z + a.lz * off * sd, bx = b.x + b.lx * off * sd, bz = b.z + b.lz * off * sd;
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), y = (a.h + b.h) / 2;
      dm.position.set((ax + bx) / 2, y + .55, (az + bz) / 2); dm.rotation.set(0, Math.atan2(-dz, dx), 0); dm.scale.set(l * 1.03, 1, 1); dm.updateMatrix();
      wm.setMatrixAt(i * 2 + j, dm.matrix); wm.setColorAt(i * 2 + j, (i >> 1) % 2 ? red : wht);
      pair.push({cx: (ax + bx) / 2, cz: (az + bz) / 2, ax: dx / l, az: dz / l, hl: l / 2 + .1, ht: .6, R: l / 2 + 2.7});
    });
    L.walls.push(pair);
  }
  world.add(wm);

  // arcos e linhas
  const checker = mkTex((c, w, h) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#fff'; c.fillRect(x * w / 8, y * h / 2, w / 8, h / 2); } });
  const gate = (i, color, tex) => {
    const p = P[i], g = new THREE.Group(), pm = new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: .5});
    // Os postes ficam no eixo local X e o grupo inteiro gira uma única vez
    // para ficar perpendicular à direção da pista, inclusive nas curvas.
    for (const sd of [1, -1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.5, 6, .5), pm); post.position.set((W / 2 + .9) * sd, 3, 0); g.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W + 2.4, 1, .5), tex ? new THREE.MeshStandardMaterial({map: tex}) : pm);
    beam.position.y = 6; g.add(beam); g.position.set(p.x, p.h, p.z); g.rotation.y = Math.atan2(p.tx, p.tz); world.add(g);
  };
  L.cp.forEach(i => gate(i, 0x22d3ee)); gate(E, 0xffffff, checker); gate(S0, 0xffd23d, checker);
  for (const i of [S0, E]) {
    const p = P[i], t = checker.clone(); t.repeat.set(W / 2, 1); t.needsUpdate = true;
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(W, 2), new THREE.MeshBasicMaterial({map: t}));
    ln.rotation.set(-Math.PI / 2, 0, 0); const gr = new THREE.Group(); gr.add(ln); gr.position.set(p.x, p.h + .06, p.z); gr.rotation.y = Math.atan2(p.tx, p.tz); world.add(gr);
  }

  // obstáculos
  const stripe = mkTex((c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e63946'; c.fillRect(0, 0, w / 2, h); }, 64, 8);
  const coneG = new THREE.ConeGeometry(.4, 1, 12), coneM = new THREE.MeshStandardMaterial({color: 0xff6a00}), stripeG = new THREE.CylinderGeometry(.27, .31, .16, 12), whiteM = new THREE.MeshStandardMaterial({color: 0xffffff});
  // MODO EXTREMO: adiciona fileiras extras de obstáculos ao longo da pista.
  // Cada fileira deixa uma passagem estreita, alternando de lado para exigir reflexos.
  const obstacleSet = [...D.obs];
  const obstacleStep = n === 2 ? 0.075 : (D.endless ? 0.012 : 0.047);
  for (let row = 0, u = 0.105; u < 0.965; u += obstacleStep, row++) {
    const gapSide = row % 2 === 0 ? -1 : 1;
    // Abertura maior para o carro passar sem ficar preso entre duas barreiras.
    const gap = D.endless ? 3.5 : (n === 2 ? 3.4 : Math.max(2.8, W * 0.20));
    const sideLat = Math.max(2.4, W * 0.29);
    const blockHalf = D.endless ? 1.35 : (n === 2 ? 1.35 : Math.max(1.4, W * 0.13));
    // Duas barreiras laterais deixam uma passagem estreita no lado alternado.
    obstacleSet.push(['b', u, gapSide * (gap + blockHalf), blockHalf]);
    obstacleSet.push(['b', u, -gapSide * (gap + blockHalf), blockHalf]);
    // Fileiras intercaladas de cones forçam pequenas correções de direção.
    if (row % 2 === 0) {
      obstacleSet.push(['c', Math.min(.985, u + .021), gapSide * (W * .12), 0]);
      obstacleSet.push(['c', Math.min(.985, u + .021), -gapSide * (W * .12), 0]);
    } else {
      obstacleSet.push(['k', Math.min(.985, u + .021), gapSide * (W * .25)]);
    }
  }
  obstacleSet.forEach(([t, u, lat, hl], k) => {
    const idx = clamp(Math.round(u * N), S0 + 4, E - 4), c = P[idx], x = c.x + c.lx * lat, z = c.z + c.lz * lat, th = Math.atan2(c.tx, c.tz);
    let mesh, o;
    if (t === 'c') {
      mesh = new THREE.Group(); const a = new THREE.Mesh(coneG, coneM), b = new THREE.Mesh(stripeG, whiteM); a.position.y = .5; b.position.y = .55; a.castShadow = true; mesh.add(a, b);
      mesh.position.set(x, c.h, z); o = {cx: x, cz: z, ax: 1, az: 0, hl: .4, ht: .4, knock: true};
    } else if (t === 'k') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 3.2), new THREE.MeshStandardMaterial({color: 0xf59e0b})); mesh.position.set(x, c.h + 1, z); mesh.rotation.y = th;
      o = {cx: x, cz: z, ax: c.tx, az: c.tz, hl: 1.6, ht: 1.6};
    } else {
      const tx = stripe.clone(); tx.repeat.set(hl, 1); tx.needsUpdate = true;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(hl * 2, 1.1, 1), new THREE.MeshStandardMaterial({map: tx})); mesh.position.set(x, c.h + .55, z); mesh.rotation.y = th;
      o = {cx: x, cz: z, ax: c.lx, az: c.lz, hl, ht: .5};
      if (t === 'm') L.dyn.push({o, mesh, c, amp: W / 2 - hl - .3, spd: .8, ph: k * 1.7});
    }
    mesh.traverse(m => { if (m.isMesh) m.castShadow = true; });
    o.R = o.hl + o.ht + 2; o.mesh = mesh; L.obs.push(o); world.add(mesh);
  });

  // CENÁRIO EXTREMO: vegetação, rochas, postes, placas, estruturas e detalhes de pista.
  // Todos os objetos são criados em relação à curva, mantendo-se fora da área dirigível.
  const scenery = new THREE.Group(); world.add(scenery);
  // Árvores importadas do arquivo GLB enviado pelo usuário.
  // Mantém a mesma distribuição e as mesmas distâncias seguras da pista.
  const treeCount = Math.max(180, Math.round(N * .8));
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({color: 0x5a5d60, roughness: 1}), Math.max(100, Math.round(N * .6)));
  const rock2 = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({color: 0x77746d, roughness: 1}), Math.max(70, Math.round(N * .4)));
  const obj = new THREE.Object3D(); let rockN = 0, rock2N = 0;
  const treeSpots = [];
  for (let tries = 0; tries < treeCount * 12 && treeSpots.length < treeCount; tries++) {
    const idx = 3 + Math.floor(Math.random() * (N - 6)), q = P[idx];
    const side = Math.random() < .5 ? -1 : 1;
    const lateral = W / 2 + 9 + Math.random() * 32;
    const x = q.x + q.lx * side * lateral, z = q.z + q.lz * side * lateral;
    // Mantém o cenário longe da pista inteira, inclusive nas curvas.
    if (P.some((pt, i) => i % 3 === 0 && (pt.x - x) ** 2 + (pt.z - z) ** 2 < (W / 2 + 5) ** 2)) continue;
    treeSpots.push({x, z, scale: 3.8 + Math.random() * 3.2, rotation: Math.random() * TAU});
  }

  new GLTFLoader().load('assets/teste_arvore_2.glb', (gltf) => {
    // Otimização principal: em vez de clonar toda a árvore centenas de vezes,
    // agrupa cada parte do modelo em InstancedMesh. A posição e a escala visual
    // das árvores permanecem iguais, mas há muito menos chamadas de desenho.
    const treeTemplate = gltf.scene;
    treeTemplate.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(treeTemplate);
    const size = new THREE.Vector3(); bounds.getSize(size);
    const height = Math.max(size.y, 0.001);
    const baseY = bounds.min.y;
    const sourceMeshes = [];
    treeTemplate.traverse((part) => {
      if (part.isMesh && part.geometry && part.material) sourceMeshes.push(part);
    });
    const rootMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const finalMatrix = new THREE.Matrix4();
    for (const source of sourceMeshes) {
      const instances = new THREE.InstancedMesh(source.geometry, source.material, treeSpots.length);
      instances.name = 'ArvoresInstanciadas';
      // Sombras de centenas de árvores são caras; a iluminação do ambiente
      // continua ativa e as árvores mantêm materiais e silhueta originais.
      instances.castShadow = false;
      instances.receiveShadow = false;
      for (let i = 0; i < treeSpots.length; i++) {
        const spot = treeSpots[i];
        position.set(spot.x, -baseY * spot.scale / height, spot.z);
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.rotation);
        scale.setScalar(spot.scale / height);
        rootMatrix.compose(position, quaternion, scale);
        finalMatrix.multiplyMatrices(rootMatrix, source.matrixWorld);
        instances.setMatrixAt(i, finalMatrix);
      }
      instances.instanceMatrix.needsUpdate = true;
      instances.computeBoundingSphere();
      scenery.add(instances);
    }
  }, undefined, (error) => {
    console.error('Não foi possível carregar assets/teste_arvore_2.glb:', error);
  });

  for (let tries = 0; tries < rocks.count * 8 && (rockN < rocks.count || rock2N < rock2.count); tries++) {
    const idx = 3 + Math.floor(Math.random() * (N - 6)), q = P[idx], side = Math.random() < .5 ? -1 : 1;
    const lateral = W / 2 + 3 + Math.random() * 22, x = q.x + q.lx * side * lateral, z = q.z + q.lz * side * lateral;
    if (P.some((p, i) => i % 3 === 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < (W / 2 + 2.5) ** 2)) continue;
    const sc = .5 + Math.random() * 2.1; obj.position.set(x, sc * .38, z); obj.rotation.set(Math.random(), Math.random() * TAU, Math.random()); obj.scale.set(sc * (0.8 + Math.random()), sc * .7, sc * (0.7 + Math.random())); obj.updateMatrix();
    if (Math.random() < .58 && rockN < rocks.count) rocks.setMatrixAt(rockN++, obj.matrix); else if (rock2N < rock2.count) rock2.setMatrixAt(rock2N++, obj.matrix);
  }
  rocks.count = rockN; rock2.count = rock2N; rocks.castShadow = rock2.castShadow = false; rocks.receiveShadow = rock2.receiveShadow = false; scenery.add(rocks, rock2);

  // Postes de iluminação com lâmpadas emissivas, colocados em intervalos regulares.
  const lampPoleMat = new THREE.MeshStandardMaterial({color: 0x333b43, metalness: .65, roughness: .4});
  const lampGeo = new THREE.CylinderGeometry(.09, .13, 6.5, 8), armGeo = new THREE.BoxGeometry(1.6, .12, .12), bulbGeo = new THREE.SphereGeometry(.28, 10, 8);
  const bulbMat = new THREE.MeshStandardMaterial({color: 0xffe6a3, emissive: 0xffc75e, emissiveIntensity: 2.2});
  const lampStride = Math.max(8, Math.floor(N / 30));
  for (let i = 5; i < N - 5; i += lampStride) {
    const q = P[i];
    for (const side of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(q.x + q.lx * side * (W / 2 + 2.2), q.h, q.z + q.lz * side * (W / 2 + 2.2));
      const pole = new THREE.Mesh(lampGeo, lampPoleMat); pole.position.y = 3.25; pole.castShadow = true; g.add(pole);
      const arm = new THREE.Mesh(armGeo, lampPoleMat); arm.position.set(-side * .68, 6.25, 0); g.add(arm);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat); bulb.position.set(-side * 1.35, 6.05, 0); g.add(bulb);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(.55, 8, 6), new THREE.MeshBasicMaterial({color: 0xffd982, transparent: true, opacity: .16})); halo.position.copy(bulb.position); g.add(halo);
      scenery.add(g);
    }
  }

  // Placas de curva e sinalização de alta visibilidade.
  const signPoleMat = new THREE.MeshStandardMaterial({color: 0x565c62, metalness: .35, roughness: .6});
  const signRed = new THREE.MeshStandardMaterial({color: 0xe52b35, emissive: 0x4a070a, emissiveIntensity: .25, roughness: .55});
  const signWhite = new THREE.MeshStandardMaterial({color: 0xf5f3e9, roughness: .7});
  const signGeo = new THREE.BoxGeometry(2.2, 1.2, .18);
  for (let i = 14; i < N - 10; i += Math.max(12, Math.floor(N / 18))) {
    const q = P[i], bend = P[Math.min(N, i + 5)], angle = Math.atan2(bend.x - q.x, bend.z - q.z);
    for (const side of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(q.x + q.lx * side * (W / 2 + 3.2), q.h, q.z + q.lz * side * (W / 2 + 3.2)); g.rotation.y = angle;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 2.4, 7), signPoleMat); pole.position.y = 1.2; g.add(pole);
      const board = new THREE.Mesh(signGeo, signWhite); board.position.y = 2.55; board.castShadow = true; g.add(board);
      for (let a = 0; a < 3; a++) { const arrow = new THREE.Mesh(new THREE.BoxGeometry(.42, .16, .21), signRed); arrow.position.set(-.55 + a * .55, 2.55, .11); arrow.rotation.z = -.45; g.add(arrow); }
      scenery.add(g);
    }
  }

  // Pequenas áreas de grama, flores e destroços nas margens para enriquecer o solo.
  const detailGeo = new THREE.ConeGeometry(.16, .65, 5), detailMat = new THREE.MeshStandardMaterial({color: 0x8baf4b, roughness: 1});
  const details = new THREE.InstancedMesh(detailGeo, detailMat, Math.max(300, N * 2)); let detailN = 0;
  for (let i = 0; i < details.count; i++) {
    const q = P[Math.floor(Math.random() * N)], side = Math.random() < .5 ? -1 : 1, lateral = W / 2 + 1.5 + Math.random() * 9;
    const x = q.x + q.lx * side * lateral, z = q.z + q.lz * side * lateral;
    obj.position.set(x, .25, z); obj.rotation.set(0, Math.random() * TAU, 0); const sc = .5 + Math.random() * 1.8; obj.scale.set(sc, sc, sc); obj.updateMatrix(); details.setMatrixAt(detailN++, obj.matrix);
  }
  details.count = detailN; scenery.add(details);

  // Fachos e barreiras laterais já existentes ganham faixas refletivas extras.
  const edgeMat = new THREE.MeshStandardMaterial({color: 0xffd84a, emissive: 0x4d3300, emissiveIntensity: .25, roughness: .65});
  for (let i = 0; i < N; i += 4) {
    const q = P[i];
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.14, .45, .14), edgeMat);
      post.position.set(q.x + q.lx * side * (W / 2 + .9), q.h + .35, q.z + q.lz * side * (W / 2 + .9));
      scenery.add(post);
    }
  }

}

function locate(x, z, from) {
  const lo = from < 0 ? 0 : Math.max(0, from - 30), hi = from < 0 ? L.N : Math.min(L.N, from + 30); let b = lo, bd = 1e12;
  for (let i = lo; i <= hi; i++) { const p = L.P[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; b = i; } }
  return {i: b, d: Math.sqrt(bd)};
}

/* ================= ESTADO ================= */
const keys = {}; const hudEl = {};
['hud', 'hLv', 'hCp', 'hT', 'hTot', 'hint', 'alert', 'count', 'cn', 'hSp', 'hPr', 'hPct'].forEach(i => hudEl[i] = $(i));
let state = 'loading', cur = 0, car = null, camMode = 0, camYaw = 0, camPos = new THREE.Vector3(), shake = 0;
let tRun = 0, simT = 0, cps = 0, cpSave = null, count = {on: false, t: 5}, alertT = 0, lastHit = -9, deadT = 0, deadReason = '', flash = 0;
let totalAcc = 0, attempts = 0, hbPrev = false;

function showOv(id) { document.querySelectorAll('.ov').forEach(o => o.hidden = o.id !== id); }
const hideOv = () => document.querySelectorAll('.ov').forEach(o => o.hidden = true);
const backTarget = () => state === 'paused' ? 'pause' : 'menu';
const unlocked = () => Math.min(LEVELS.length, +(ls.get('rrUnlocked') || 1));
const best = n => +ls.get('rrBest' + n) || 0;
function setAlert(msg, t = 1.3) { hudEl.alert.textContent = msg; hudEl.alert.classList.add('on'); alertT = t; }

function toMenu() {
  state = 'menu'; hudEl.hud.hidden = true; carRoot.visible = false; showOv('menu');
  $('best').textContent = LEVELS.map((l, i) => best(i) ? `Fase ${i + 1}: ${fmt(best(i))}` : '').filter(Boolean).join('  •  ') || 'Nenhum recorde ainda';
}

function start(n, fromCp) {
  if (!fromCp) cpSave = null;
  initAudio(); cur = n; buildLevel(n);
  const i0 = fromCp && cpSave ? cpSave.idx : L.S0, p = L.P[i0];
  car = {x: p.x, z: p.z, psi: Math.atan2(p.tx, p.tz), v: 0, steer: 0, idx: i0, y: p.h};
  tRun = fromCp && cpSave ? cpSave.t : 0; cps = fromCp && cpSave ? cpSave.n : 0; simT = 0;
  count = {on: false, t: CFG.penaltySeconds}; hudEl.count.hidden = true; shake = 0; flash = 0;
  fireball.visible = false; boomLight.intensity = 0; smokes.forEach(s => s.visible = false);
  carRoot.visible = true; state = 'playing'; hideOv(); hudEl.hud.hidden = false;
  hudEl.hLv.textContent = `Fase ${n + 1} — ${L.name}`;
  camYaw = car.psi; updateCamera(1, true);
}

function endAttempt() { totalAcc += tRun; attempts++; }

function explode(reason) {
  if (state !== 'playing') return;
  state = 'dead'; deadReason = reason; deadT = 0; carRoot.visible = false; hudEl.count.hidden = true; endAttempt();
  const y = car.y + 1; flash = 1; fireball.visible = true; fireball.position.set(car.x, y, car.z); fireball.scale.setScalar(.5); fireball.material.opacity = 1;
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * TAU, b = Math.random() * Math.PI - 1.57, sp = 3 + Math.random() * 14;
    emit(car.x, y, car.z, Math.cos(a) * Math.cos(b) * sp, Math.abs(Math.sin(b)) * sp * .9 + 2, Math.sin(a) * Math.cos(b) * sp, .6 + Math.random() * 1.2, 1, .35 + Math.random() * .5, .05);
  }
  smokes.forEach((s, i) => { s.visible = true; s.userData.t = -i * .08; s.position.set(car.x + (Math.random() - .5) * 2, y, car.z + (Math.random() - .5) * 2); s.scale.setScalar(.8); });
  boom(1.6, .9, 900); shake = 1.2;
}

function win() {
  state = 'won'; endAttempt(); hudEl.count.hidden = true;
  const isBest = !best(cur) || tRun < best(cur); if (isBest) ls.set('rrBest' + cur, tRun.toFixed(2));
  if (cur + 1 < LEVELS.length) ls.set('rrUnlocked', Math.max(unlocked(), cur + 2));
  $('endT').textContent = '🏁 FASE CONCLUÍDA!'; $('endM').textContent = `Tempo: ${fmt(tRun)}${isBest ? ' — novo recorde!' : ''}`;
  $('endS').textContent = `Tentativas: ${attempts} • Tempo total: ${fmt(totalAcc)}`;
  $('bRetry').textContent = 'Jogar de novo';$('bNext').hidden = cur + 1 >= LEVELS.length; showOv('end'); hudEl.hud.hidden = true;
}

function showLose() {
  $('endT').textContent = deadReason; $('endM').textContent = `Tempo de sobrevivência: ${fmt(tRun)}`;
  $('endS').textContent = `Tentativas: ${attempts}${cpSave ? ' • retomar do checkpoint ' + cpSave.n : ''}`;
  $('bRetry').textContent = 'Tentar novamente'; $('bNext').hidden = true; showOv('end'); hudEl.hud.hidden = true;
}

/* ================= FÍSICA ================= */
function hit(px, pz, r, o) {
  const dx = px - o.cx, dz = pz - o.cz, lx = dx * o.ax + dz * o.az, lz = -dx * o.az + dz * o.ax;
  const qx = clamp(lx, -o.hl, o.hl), qz = clamp(lz, -o.ht, o.ht), ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(d2); let nx, nz, pen;
  if (d > 1e-6) { nx = ex / d; nz = ez / d; pen = r - d; }
  else { const a = o.hl - Math.abs(lx), b = o.ht - Math.abs(lz); if (a < b) { nx = Math.sign(lx) || 1; nz = 0; pen = a + r; } else { nx = 0; nz = Math.sign(lz) || 1; pen = b + r; } }
  return {x: nx * o.ax - nz * o.az, z: nx * o.az + nz * o.ax, pen};
}

function knock(o, h) {
  o.hit = true; const sp = 5 + Math.abs(car.v) * .8;
  L.flying.push({m: o.mesh, vx: -h.x * sp, vy: 4 + Math.abs(car.v) * .3, vz: -h.z * sp, t: 1.6});
  car.v *= .97; boom(.1, .25, 1500);
}

function step(dt) {
  simT += dt; tRun += dt;
  // Controles invertidos: S atua para andar de ré, W atua para frear / andar de frente
  const rev = keys.KeyS || keys.ArrowDown, fwd = keys.KeyW || keys.ArrowUp, hb = keys.Space, s = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
  let v = car.v;
  if (rev) v += (v < 0 ? CFG.brake : CFG.accel * Math.max(.15, 1 - Math.max(0, v) / CFG.maxRev)) * dt;
  else if (fwd) { if (v > .3) v -= CFG.brake * dt; else v -= 6 * dt * Math.max(.2, 1 - (-v) / CFG.maxFwd); }
  else v -= Math.sign(v) * Math.min(Math.abs(v), (CFG.coast + Math.abs(v) * .08) * dt);
  if (hb) v -= Math.sign(v) * Math.min(Math.abs(v), CFG.handbrake * dt);
  car.v = v = clamp(v, -CFG.maxFwd, CFG.maxRev);
  car.steer += (s - car.steer) * Math.min(1, 8 * dt);
  car.psi += car.steer * CFG.steerRate * clamp(v / 5, -1, 1) / (1 + Math.abs(v) / 35) * (hb ? 1.6 : 1) * dt;
  const sn = Math.sin(car.psi), cs = Math.cos(car.psi);
  car.x += sn * v * dt; car.z += cs * v * dt;
  // colisões
  const lo = Math.max(0, car.idx - 8), hi = Math.min(L.N - 1, car.idx + 8), list = [];
  for (let i = lo; i <= hi; i++) list.push(L.walls[i][0], L.walls[i][1]);
  for (const o of L.obs) if (!o.hit) list.push(o);
  let worst = 0;
  for (const off of [-1.4, 0, 1.4]) {
    const px = car.x + sn * off, pz = car.z + cs * off;
    for (const o of list) {
      if (Math.abs(px - o.cx) > o.R || Math.abs(pz - o.cz) > o.R) continue;
      const h = hit(px, pz, CFG.carRadius, o); if (!h) continue;
      if (o.knock) { knock(o, h); continue; }
      const nc = h.x * sn + h.z * cs, closing = -car.v * nc;
      car.x += h.x * h.pen; car.z += h.z * h.pen;
      if (closing > 0) { car.v *= Math.max(0, 1 - 8 * dt * Math.abs(nc)); worst = Math.max(worst, closing); }
    }
  }
  if (worst > 5 && simT - lastHit > .3) {
    lastHit = simT; shake = Math.min(1, worst / 15); setAlert('COLISÃO!', .8); boom(.25, .45, 700);
    for (let i = 0; i < 16; i++) emit(car.x, car.y + .6, car.z, (Math.random() - .5) * 8, Math.random() * 6, (Math.random() - .5) * 8, .5, 1, .85, .3);
  }
  if (worst > CFG.fatalImpact) return explode('ACIDENTE FATAL!');

  // obstáculos móveis
  for (const d of L.dyn) { const lat = d.amp * Math.sin(simT * d.spd + d.ph); d.o.cx = d.c.x + d.c.lx * lat; d.o.cz = d.c.z + d.c.lz * lat; d.mesh.position.x = d.o.cx; d.mesh.position.z = d.o.cz; }

  // posição na pista
  const loc = locate(car.x, car.z, car.idx); car.idx = loc.i; car.y = L.P[loc.i].h;
  if (loc.d > L.W / 2 + 8) { explode('VOCÊ SAIU DA PISTA!'); return; }
  if (cps < 3 && car.idx >= L.cp[cps]) { cps++; cpSave = {idx: L.cp[cps - 1], t: tRun, n: cps}; setAlert(`CHECKPOINT ${cps}/3`, 1.5); }
  if (car.idx >= L.E) return win();

  // REGRA DOS 5 SEGUNDOS
  if (v < -CFG.fwdThreshold) {
    if (!count.on) { count.on = true; count.t = CFG.penaltySeconds; hudEl.count.hidden = false; }
    count.t -= dt; if (count.t <= 0) { count.t = 0; explode('VOCÊ ANDOU PARA FRENTE!'); }
  } else if (count.on && v > -CFG.fwdCancel) { count.on = false; hudEl.count.hidden = true; }
  if (hb && !hbPrev && Math.abs(v) > 5) boom(.3, .2, 3500); hbPrev = hb;
}

/* ================= CÂMERA / HUD / ÁUDIO ================= */
function updateCamera(dt, snap) {
  const c = CFG.cams[camMode], k = snap ? 1 : 1 - Math.exp(-6 * dt);
  camYaw += wrapA(car.psi - camYaw) * (snap ? 1 : Math.min(1, 3.2 * dt));
  const dx = Math.sin(camYaw), dz = Math.cos(camYaw);
  // Câmera jogável à frente do carro: vê grade/faróis e os obstáculos
  // que ficam no sentido em que o veículo está recuando. A tecla C alterna distância.
  const tgt = new THREE.Vector3(car.x - dx * c.dist, Math.max(1.2, car.y + c.height), car.z - dz * c.dist);
  camPos.lerp(tgt, k); if (snap) camPos.copy(tgt);
  shake = Math.max(0, shake - dt * 2);
  camera.position.set(camPos.x + (Math.random() - .5) * shake * .5, Math.max(1.2, camPos.y) + (Math.random() - .5) * shake * .5, camPos.z);
  // Mira através do carro, na direção da pista e dos obstáculos.
  camera.lookAt(car.x + dx * 3.5, car.y + 0.8, car.z + dz * 3.5);
  const fov = 62 + Math.min(14, Math.abs(car.v) * .5); if (Math.abs(camera.fov - fov) > .05) { camera.fov += (fov - camera.fov) * .1; camera.updateProjectionMatrix(); }
  sun.position.set(car.x + 30, 55, car.z + 20); sun.target.position.set(car.x, 0, car.z); sun.target.updateMatrixWorld();
}

function updateHud() {
  hudEl.hSp.textContent = Math.round(Math.abs(car.v) * 3.6);
  hudEl.hT.textContent = fmt(tRun); hudEl.hTot.textContent = `Total: ${fmt(totalAcc + tRun)} • Tentativa ${attempts + 1}`;
  const pr = clamp((car.idx - L.S0) / (L.E - L.S0), 0, 1); hudEl.hPr.style.width = pr * 100 + '%'; hudEl.hPct.textContent = Math.round(pr * 100) + '%';
  hudEl.hCp.textContent = `Checkpoints: ${cps}/3`;
  const goingFwd = car.v < -CFG.fwdThreshold; hudEl.hint.className = goingFwd ? 'bad' : ''; hudEl.hint.textContent = goingFwd ? '⚠ VOCÊ ESTÁ INDO PARA FRENTE!' : '⬇ DIRIJA DE RÉ — segure S';
  if (count.on) { hudEl.cn.textContent = Math.ceil(count.t); hudEl.count.classList.toggle('crit', count.t <= 2); }
}

function updateVisuals(dt) {
  // O movimento segue a pista, mas a carroceria aponta no sentido contrário:
  // assim o carro avança pela fase de ré, com a dianteira voltada para a câmera.
  carRoot.position.set(car.x, car.y, car.z); carRoot.rotation.y = car.psi + Math.PI;
  for (const w of wheels) { w.spin.rotation.x -= car.v * dt / w.r; if (w.front) w.piv.rotation.y = -car.steer * .45; }
  for (const f of L.flying) { f.t -= dt; f.vy -= 15 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; f.m.rotation.x += 8 * dt; f.m.rotation.z += 6 * dt; if (f.t <= 0) f.m.visible = false; }
  L.flying = L.flying.filter(f => f.t > 0);
}

function updateAudio() {
  if (!A.ctx) return;
  A.osc.frequency.setTargetAtTime(50 + Math.abs(car ? car.v : 0) * 5, A.ctx.currentTime, .05);
  A.eg.gain.setTargetAtTime(state === 'playing' ? .03 + .05 * Math.abs(car.v) / CFG.maxRev : 0, A.ctx.currentTime, .05);
}

/* ================= LOOP ================= */
const STEP = 1 / 120; let acc = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (state === 'playing') { acc += dt; while (acc >= STEP && state === 'playing') { step(STEP); acc -= STEP; } }
  if (car && L) {
    if (state !== 'paused') {
      updateVisuals(state === 'playing' ? dt : 0); updateParticles(dt); updateCamera(dt);
      if (state === 'playing') updateHud();
      if (alertT > 0 && (alertT -= dt) <= 0) hudEl.alert.classList.remove('on');
    }
    if (state === 'dead') {
      deadT += dt; fireball.scale.addScalar(dt * 9); fireball.material.opacity = Math.max(0, 1 - deadT * 1.4); flash = Math.max(0, flash - dt * 2.5); boomLight.position.copy(fireball.position); boomLight.intensity = flash * 800;
      smokes.forEach(s => { s.userData.t += dt; const t = s.userData.t; if (t > 0) { s.position.y += dt * 3; s.scale.addScalar(dt * 3); s.material.opacity = Math.max(0, .6 - t * .3); } });
      if (deadT > 1.9 && !$('end').hidden === false && state === 'dead') showLose();
    }
  }
  updateAudio(); renderer.render(scene, camera);
}

/* ================= ENTRADA E MENUS ================= */
function togglePause() {
  if (state === 'playing') { state = 'paused'; showOv('pause'); } else if (state === 'paused') { state = 'playing'; hideOv(); last = performance.now(); }
}
function buildLevelMenu() {
  const box = $('lvBtns'); box.innerHTML = '';
  LEVELS.forEach((l, i) => { const b = document.createElement('button'); b.textContent = `Fase ${i + 1} — ${l.name}${i < unlocked() ? '' : ' 🔒'}${best(i) ? ' (' + fmt(best(i)) + ')' : ''}`; b.disabled = i >= unlocked(); b.onclick = () => start(i); box.appendChild(b); });
}
const actions = {
  play: () => start(0), levels: () => { buildLevelMenu(); showOv('levels'); }, controls: () => showOv('controls'), options: () => showOv('options'),
  back: () => showOv(backTarget()), resume: togglePause, restart: () => start(cur), menu: toMenu,
  retry: () => start(cur, state === 'dead' && !!cpSave), next: () => start(cur + 1)
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && actions[b.dataset.a]) { initAudio(); actions[b.dataset.a](); } });
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyC', 'KeyR', 'Escape', 'Enter', 'ArrowUp', 'ArrowDown']);
addEventListener('keydown', e => {
  if (!GAME_KEYS.has(e.code)) return; e.preventDefault(); keys[e.code] = true; if (e.repeat) return; initAudio();
  if (e.code === 'Enter') { const b = document.querySelector('.ov:not([hidden]) .primary'); if (b) b.click(); }
  else if (e.code === 'Escape') { if (state === 'playing' || state === 'paused') togglePause(); else if (!$('menu').hidden === false && state === 'menu') showOv('menu'); }
  else if (e.code === 'KeyC') camMode = (camMode + 1) % CFG.cams.length;
  else if (e.code === 'KeyR' && car && ['playing', 'paused', 'dead', 'won'].includes(state)) start(cur);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'playing') togglePause(); });
$('vol').value = A.vol; $('mute').checked = A.mute;
$('vol').oninput = e => { A.vol = +e.target.value; ls.set('rrVol', A.vol); applyVol(); };
$('mute').onchange = e => { A.mute = e.target.checked; ls.set('rrMute', A.mute ? '1' : '0'); applyVol(); };

/* ================= INÍCIO ================= */
await loadCar();
buildLevel(0); car = {x: 0, z: 0, psi: 0, v: 0, steer: 0, idx: L.S0, y: 0};
const p0 = L.P[L.S0]; car.x = p0.x; car.z = p0.z; car.psi = Math.atan2(p0.tx, p0.tz);
camYaw = car.psi; updateCamera(1, true); carRoot.visible = false;
$('loading').hidden = true; toMenu(); requestAnimationFrame(frame);
