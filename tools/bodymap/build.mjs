// Builds the body-map GLB from BodyParts3D OBJ files. See README.md for the download steps.
// Usage: node build.mjs <bp3d-raw dir> <out.glb>
//
// Output meshes (by node name):
//   skin        grey body: skin pulled in onto the muscles (head / hands / feet keep the real skin)
//   base        grey: every other superficial muscle (definition, not clickable)
//   <muscle id> one mesh per clickable muscle (both sides), ids match fitness-web/src/utils/muscles.ts
//   lats, abs   not in BodyParts3D: raised patches of the pulled-in skin
//   shorts, shorts_back, hair   (shorts_back stands in for the glutes it covers)
// Vertex colours (COLOR_0) carry baked ambient occlusion.
//
// Coordinates: BodyParts3D is millimetres, z up, front = -y, the body's right side at -x.
// glTF: metres, y up, front = +z, feet at y = 0.
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const [raw, outFile] = process.argv.slice(2);
const isaDir = path.join(raw, 'isa', fs.readdirSync(path.join(raw, 'isa'))[0]);
const partofDir = path.join(raw, 'obj', fs.readdirSync(path.join(raw, 'obj'))[0]);
const inventory = JSON.parse(fs.readFileSync(path.join(raw, 'inventory.json'), 'utf8'));

const FLOOR = -78.1; // lowest skin point (mm)
const CENTER_Y = -100; // front/back centre (mm)
const toGl = (x, y, z) => [x / 1000, (z - FLOOR) / 1000, -(y - CENTER_Y) / 1000];

// ---------------------------------------------------------------- selection

const SIDE = '(right|left)';
const TARGETS = {
  pectorals: [`part of ${SIDE} pectoralis major`],
  deltoids: [`part of ${SIDE} deltoid`],
  traps: [`part of ${SIDE} trapezius`],
  lower_back: [`^${SIDE} (iliocostalis lumborum|iliocostalis thoracis|longissimus thoracis|spinalis thoracis)$`],
  biceps: [`head of ${SIDE} biceps brachii`, `^${SIDE} brachialis$`],
  triceps: [`head of ${SIDE} triceps brachii`, `^${SIDE} anconeus$`],
  forearms: [
    `^${SIDE} (brachioradialis|flexor carpi radialis|palmaris longus|extensor carpi radialis (longus|brevis)|extensor carpi ulnaris|extensor digitorum|extensor digiti minimi|flexor digitorum superficialis|abductor pollicis longus|extensor pollicis brevis)$`,
    `head of ${SIDE} (flexor carpi ulnaris|pronator teres)`,
  ],
  obliques: [`^${SIDE} external oblique$`],
  glutes: [`^${SIDE} gluteus (maximus|medius)$`],
  quads: [`^${SIDE} (rectus femoris|vastus lateralis|vastus medialis)$`],
  hamstrings: [`head of ${SIDE} biceps femoris`, `^${SIDE} (semitendinosus|semimembranosus)$`],
  adductors: [`^${SIDE} (adductor longus|adductor magnus|gracilis|pectineus)$`],
  calves: [`head of ${SIDE} gastrocnemius`, `^${SIDE} soleus$`],
  tibialis: [`^${SIDE} tibialis anterior$`],
};

// Deep or hidden muscles that only cost triangles.
const SKIP = new RegExp(
  [
    'of head', 'extra-ocular', 'rectus$', 'superior oblique$', 'inferior oblique$', 'palpebrae', 'pharyn', 'glossus', 'palat',
    'arytenoid', 'thyro', 'crico', 'vocalis', 'uvul', 'perine', 'coccyg', 'levator ani', 'iliococcygeus', 'pubococcygeus',
    'puborectalis', 'diaphragm', 'intercostal', 'transversus thoracis', 'of hand', 'of foot', 'thenar', 'lumbrical',
    'interosse', 'digastric', 'mylohyoid', 'geniohyoid', 'stylohyoid', 'longus colli', 'longus capitis', 'rectus capitis',
    'obliquus capitis', 'rotator', 'interspinalis', 'psoas', 'iliacus', 'obturator', 'gemellus', 'piriformis',
    'quadratus femoris', 'subscapularis', 'semispinalis', 'splenius', 'longissimus c', 'iliocostalis cervicis', 'scalenus',
    'pronator quadratus', 'flexor digitorum profundus', 'flexor pollicis longus', 'tibialis posterior', 'flexor digitorum longus',
    'flexor hallucis longus', 'popliteus', 'vastus intermedius', 'adductor brevis', 'adductor minimus', 'gluteus minimus',
    'supinator', 'extensor indicis', 'extensor pollicis longus', 'serratus posterior', 'pectoralis minor', 'subclavius',
    'coracobrachialis', 'levator scapulae', 'rhomboid', 'supraspinatus', 'abductor pollicis brevis', 'opponens', 'adductor hallucis',
    'adductor pollicis', 'flexor hallucis brevis', 'extensor hallucis brevis', 'abductor hallucis', 'abductor digiti minimi',
  ].join('|'),
);

const used = new Set();
const filesFor = (patterns) => {
  const res = patterns.map((p) => new RegExp(p));
  const files = inventory.filter((o) => o.names.some((n) => res.some((r) => r.test(n)))).map((o) => o.file);
  files.forEach((f) => used.add(f));
  return [...new Set(files)];
};
const groups = Object.fromEntries(Object.entries(TARGETS).map(([id, p]) => [id, filesFor(p)]));
const baseFiles = inventory
  .filter((o) => o.kind === 'muscle' && !used.has(o.file) && !o.names.some((n) => SKIP.test(n)))
  // the side-less "organ" files duplicate the sided ones
  .filter((o) => o.names.some((n) => /(^| )(right|left) /.test(n)))
  .map((o) => o.file);

for (const [id, files] of Object.entries(groups)) {
  if (!files.length) throw new Error(`no files for ${id}`);
  console.log(id.padEnd(11), files.length, 'files');
}
console.log('base'.padEnd(11), baseFiles.length, 'files');

// ---------------------------------------------------------------- geometry helpers

function parseObj(file) {
  const dir = fs.existsSync(path.join(isaDir, `${file}.obj`)) ? isaDir : partofDir;
  const pos = [];
  const idx = [];
  for (const line of fs.readFileSync(path.join(dir, `${file}.obj`), 'utf8').split('\n')) {
    if (line.startsWith('v ')) {
      const [x, y, z] = line.slice(2).trim().split(/\s+/).map(Number);
      pos.push(...toGl(x, y, z));
    } else if (line.startsWith('f ')) {
      const f = line.slice(2).trim().split(/\s+/).map((t) => parseInt(t, 10) - 1);
      for (let i = 1; i + 1 < f.length; i++) idx.push(f[0], f[i], f[i + 1]);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

function merge(meshes) {
  const nv = meshes.reduce((s, m) => s + m.pos.length, 0);
  const ni = meshes.reduce((s, m) => s + m.idx.length, 0);
  const pos = new Float32Array(nv);
  const idx = new Uint32Array(ni);
  let pv = 0;
  let pi = 0;
  for (const m of meshes) {
    pos.set(m.pos, pv);
    for (let i = 0; i < m.idx.length; i++) idx[pi + i] = m.idx[i] + pv / 3;
    pv += m.pos.length;
    pi += m.idx.length;
  }
  return { pos, idx };
}

/** Simplify to at most `maxTris` triangles and drop unused vertices. */
function simplify(mesh, maxTris, error = 0.05, flags = []) {
  const target = Math.min(mesh.idx.length, maxTris * 3);
  const [idx] = MeshoptSimplifier.simplify(mesh.idx, mesh.pos, 3, target, error, flags);
  const remap = new Int32Array(mesh.pos.length / 3).fill(-1);
  const pos = [];
  const out = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i];
    if (remap[v] < 0) {
      remap[v] = pos.length / 3;
      pos.push(mesh.pos[v * 3], mesh.pos[v * 3 + 1], mesh.pos[v * 3 + 2]);
    }
    out[i] = remap[v];
  }
  return { pos: new Float32Array(pos), idx: out };
}

function normals(mesh) {
  const n = new Float32Array(mesh.pos.length);
  const p = mesh.pos;
  for (let i = 0; i < mesh.idx.length; i += 3) {
    const [a, b, c] = [mesh.idx[i] * 3, mesh.idx[i + 1] * 3, mesh.idx[i + 2] * 3];
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) n[v + k] += cr[k];
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

function neighbours(mesh) {
  const nb = Array.from({ length: mesh.pos.length / 3 }, () => new Set());
  for (let i = 0; i < mesh.idx.length; i += 3) {
    const [a, b, c] = [mesh.idx[i], mesh.idx[i + 1], mesh.idx[i + 2]];
    nb[a].add(b).add(c);
    nb[b].add(a).add(c);
    nb[c].add(a).add(b);
  }
  return nb.map((s) => [...s]);
}

/** Uniform grid over points for nearest-point queries. */
function pointGrid(points, cell) {
  const map = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < points.length; i += 3) {
    const k = key(points[i], points[i + 1], points[i + 2]);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(i);
  }
  return {
    nearest(x, y, z, maxDist) {
      const r = Math.ceil(maxDist / cell);
      const [cx, cy, cz] = [Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell)];
      let best = maxDist * maxDist;
      let found = false;
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++)
          for (let k = -r; k <= r; k++) {
            const list = map.get(`${cx + i},${cy + j},${cz + k}`);
            if (!list) continue;
            for (const p of list) {
              const d = (points[p] - x) ** 2 + (points[p + 1] - y) ** 2 + (points[p + 2] - z) ** 2;
              if (d < best) (best = d), (found = true);
            }
          }
      return found ? Math.sqrt(best) : Infinity;
    },
  };
}


/** Möller–Trumbore hit count of a ray against all triangles (brute force; used on a few thousand rays). */
function rayHits(mesh, o, d) {
  const p = mesh.pos;
  let hits = 0;
  for (let i = 0; i < mesh.idx.length; i += 3) {
    const a = mesh.idx[i] * 3, b = mesh.idx[i + 1] * 3, c = mesh.idx[i + 2] * 3;
    const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2];
    const e2x = p[c] - p[a], e2y = p[c + 1] - p[a + 1], e2z = p[c + 2] - p[a + 2];
    const hx = d[1] * e2z - d[2] * e2y, hy = d[2] * e2x - d[0] * e2z, hz = d[0] * e2y - d[1] * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(det) < 1e-12) continue;
    const f = 1 / det;
    const sx = o[0] - p[a], sy = o[1] - p[a + 1], sz = o[2] - p[a + 2];
    const u = f * (sx * hx + sy * hy + sz * hz);
    if (u < 0 || u > 1) continue;
    const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
    const v = f * (d[0] * qx + d[1] * qy + d[2] * qz);
    if (v < 0 || u + v > 1) continue;
    if (f * (e2x * qx + e2y * qy + e2z * qz) > 1e-5) hits++;
  }
  return hits;
}

/**
 * BodyParts3D skin is a shell with an outer and an inner surface. A ray along the normal from the
 * outer surface crosses 0 (mod 4) surfaces; from the inner surface it crosses the opposite wall: 2 (mod 4).
 * Classify each connected component by a vote of sampled vertices and keep the outer ones.
 */
function outerSurface(mesh) {
  const nvx = mesh.pos.length / 3;
  const parent = Int32Array.from({ length: nvx }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (let i = 0; i < mesh.idx.length; i += 3) {
    const r = find(mesh.idx[i]);
    parent[find(mesh.idx[i + 1])] = r;
    parent[find(mesh.idx[i + 2])] = r;
  }
  const comps = new Map();
  for (let v = 0; v < nvx; v++) {
    const r = find(v);
    if (!comps.has(r)) comps.set(r, []);
    comps.get(r).push(v);
  }
  const n = normals(mesh);
  const outer = new Set();
  for (const [root, verts] of comps) {
    const step = Math.max(1, Math.floor(verts.length / 9));
    let votes = 0, total = 0;
    for (let i = 0; i < verts.length; i += step) {
      const v = verts[i];
      const d = [n[v * 3], n[v * 3 + 1], n[v * 3 + 2]];
      const o = [mesh.pos[v * 3] + d[0] * 1e-4, mesh.pos[v * 3 + 1] + d[1] * 1e-4, mesh.pos[v * 3 + 2] + d[2] * 1e-4];
      votes += rayHits(mesh, o, d) % 4 < 1 ? 1 : 0;
      total++;
    }
    if (votes / total > 0.5) outer.add(root);
  }
  const idx = [];
  for (let i = 0; i < mesh.idx.length; i += 3) if (outer.has(find(mesh.idx[i]))) idx.push(mesh.idx[i], mesh.idx[i + 1], mesh.idx[i + 2]);
  console.log('skin components', comps.size, 'outer', outer.size, 'tris', mesh.idx.length / 3, '->', idx.length / 3);
  return { pos: mesh.pos, idx: new Uint32Array(idx) };
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- build

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const loaded = new Map();
const load = (f) => (loaded.has(f) ? loaded.get(f) : (loaded.set(f, parseObj(f)), loaded.get(f)));

const parts = {};
const BUDGET = { lower_back: 9000, forearms: 12000, obliques: 8000, traps: 8000, quads: 10000, hamstrings: 8000, adductors: 7000, calves: 7000 };
for (const [id, files] of Object.entries(groups)) parts[id] = simplify(merge(files.map(load)), BUDGET[id] ?? 6000);
parts.base = simplify(merge(baseFiles.map(load)), 30000);

// --- skin pulled in onto the muscles
const allMusclePts = merge([...Object.values(groups).flat(), ...baseFiles].map(load)).pos;
const grid = pointGrid(allMusclePts, 0.012);
const skinRaw = outerSurface(load('FJ2810'));
const skinN = normals(skinRaw);
const nb = neighbours(skinRaw);
const nv = skinRaw.pos.length / 3;
const EXTRA = 0.004; // muscles stand this far proud of the grey body
const offset = new Float32Array(nv);
const keep = new Float32Array(nv); // 1 = real skin (head, hands, feet)
for (let v = 0; v < nv; v++) {
  const [x, y, z] = [skinRaw.pos[v * 3], skinRaw.pos[v * 3 + 1], skinRaw.pos[v * 3 + 2]];
  const head = smoothstep(1.5, 1.53, y);
  const hand = smoothstep(0.215, 0.235, Math.abs(x)) * (1 - smoothstep(0.9, 0.93, y));
  const foot = 1 - smoothstep(0.095, 0.125, y);
  keep[v] = Math.max(head, hand, foot);
  const d = grid.nearest(x, y, z, 0.045);
  offset[v] = Math.min(d === Infinity ? 0.012 : d + EXTRA, 0.04);
}
// Smooth the offset field so the grey body has no ripples.
for (let it = 0; it < 3; it++) {
  const next = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    let s = offset[v];
    for (const u of nb[v]) s += offset[u];
    next[v] = s / (nb[v].length + 1);
  }
  offset.set(next);
}
const bodyPos = new Float32Array(skinRaw.pos.length);
for (let v = 0; v < nv; v++) {
  const o = offset[v] * (1 - keep[v]);
  for (let k = 0; k < 3; k++) bodyPos[v * 3 + k] = skinRaw.pos[v * 3 + k] - skinN[v * 3 + k] * o;
}
const bodyIdx = [];
for (let i = 0; i < skinRaw.idx.length; i += 3) {
  const t = [skinRaw.idx[i], skinRaw.idx[i + 1], skinRaw.idx[i + 2]];
  if (!t.every((v) => shortsField(skinRaw.pos[v * 3], skinRaw.pos[v * 3 + 1], skinRaw.pos[v * 3 + 2]) > 0.01)) bodyIdx.push(...t);
}
const body = { pos: bodyPos, idx: new Uint32Array(bodyIdx) };

// --- lats and abs: raised patches of the grey body
function patch(weight, bulge) {
  const n = normals(body);
  const pos = new Float32Array(body.pos.length);
  const w = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const [x, y, z] = [body.pos[v * 3], body.pos[v * 3 + 1], body.pos[v * 3 + 2]];
    w[v] = weight(x, y, z, n[v * 3 + 2]);
    const h = bulge(x, y, z) * w[v];
    for (let k = 0; k < 3; k++) pos[v * 3 + k] = body.pos[v * 3 + k] + n[v * 3 + k] * h;
  }
  const idx = [];
  for (let i = 0; i < body.idx.length; i += 3) {
    const t = [body.idx[i], body.idx[i + 1], body.idx[i + 2]];
    if (t.every((v) => w[v] > 0.12)) idx.push(...t);
  }
  return simplify({ pos, idx: new Uint32Array(idx) }, 4000, 0.01);
}

const ABS_TOP = 1.29;
const ABS_BOTTOM = 0.96;
parts.abs = patch(
  (x, y, z, nz) => smoothstep(0.2, 0.45, nz) * (1 - smoothstep(0.06, 0.078, Math.abs(x))) * smoothstep(ABS_BOTTOM, ABS_BOTTOM + 0.03, y) * (1 - smoothstep(ABS_TOP - 0.03, ABS_TOP, y)),
  (x, y) => {
    // six-pack: linea alba down the middle, three tendinous intersections across
    const alba = smoothstep(0.004, 0.014, Math.abs(x));
    const t = (y - ABS_BOTTOM) / (ABS_TOP - ABS_BOTTOM);
    const rows = [0.36, 0.6, 0.82].reduce((m, r) => Math.min(m, smoothstep(0.01, 0.05, Math.abs(t - r))), 1);
    return 0.009 * alba * (0.45 + 0.55 * rows);
  },
);
parts.lats = patch(
  (x, y, z, nz) => {
    const ax = Math.abs(x);
    const t = (y - 1.03) / (1.3 - 1.03); // 0 = waist, 1 = armpit
    const inner = 0.045 + 0.05 * Math.max(0, t); // medial edge moves out as it rises (trapezius covers it)
    const outer = 0.115 + 0.055 * Math.min(1, Math.max(0, t));
    return (
      (1 - smoothstep(-0.1, 0.15, nz)) *
      smoothstep(inner, inner + 0.02, ax) *
      (1 - smoothstep(outer - 0.015, outer, ax)) *
      smoothstep(1.02, 1.07, y) *
      (1 - smoothstep(1.27, 1.31, y))
    );
  },
  () => 0.006,
);


// --- shorts (real skin + 3 mm). The back panel doubles as the glutes' hit / highlight area.
/** Signed "inside the shorts" value: > 0 inside, 0 on the hem / waistband. */
function shortsField(x, y, z) {
  const ax = Math.abs(x);
  const top = 0.985 - 0.02 * Math.max(0, z / 0.12) - y; // waistband dips a little at the front
  const leg = y - (0.765 + 0.03 * Math.min(1, ax / 0.16)); // legs end ~1/4 down the thigh
  // the pouch at the front of the crotch reaches lower than the leg openings
  const pouch = Math.min(0.032 - ax, z - 0.02, y - 0.735);
  const hands = 0.2 - ax; // hands hang next to the hips
  return Math.min(top, Math.max(leg, pouch), hands);
}

/** Keeps the part of the mesh where field(original position) >= 0, cutting triangles cleanly along 0. */
function clipMesh(srcPos, displayPos, idx, field) {
  const f = new Float32Array(srcPos.length / 3);
  for (let v = 0; v < f.length; v++) f[v] = field(srcPos[v * 3], srcPos[v * 3 + 1], srcPos[v * 3 + 2]);
  const pos = Array.from(displayPos);
  const out = [];
  const cut = new Map();
  const edgeVert = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (cut.has(key)) return cut.get(key);
    const t = f[a] / (f[a] - f[b]);
    const id = pos.length / 3;
    for (let k = 0; k < 3; k++) pos.push(displayPos[a * 3 + k] + (displayPos[b * 3 + k] - displayPos[a * 3 + k]) * t);
    cut.set(key, id);
    return id;
  };
  for (let i = 0; i < idx.length; i += 3) {
    const t = [idx[i], idx[i + 1], idx[i + 2]];
    const ins = t.map((v) => f[v] >= 0);
    const n = ins.filter(Boolean).length;
    if (n === 3) out.push(...t);
    else if (n === 1) {
      const k = ins.indexOf(true);
      const [a, b, c] = [t[k], t[(k + 1) % 3], t[(k + 2) % 3]];
      out.push(a, edgeVert(a, b), edgeVert(a, c));
    } else if (n === 2) {
      const k = ins.indexOf(false);
      const [c, a, b] = [t[k], t[(k + 1) % 3], t[(k + 2) % 3]];
      const ac = edgeVert(a, c);
      const bc = edgeVert(b, c);
      out.push(a, b, bc, a, bc, ac);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(out) };
}

function shortsPanels() {
  const n = normals({ pos: bodyPos, idx: skinRaw.idx });
  // Fabric: smooth away anatomical detail (a band slightly wider than the shorts), then lift off the body.
  const pos = Float32Array.from(bodyPos);
  const band = new Uint8Array(nv);
  for (let v = 0; v < nv; v++) band[v] = shortsField(skinRaw.pos[v * 3], skinRaw.pos[v * 3 + 1], skinRaw.pos[v * 3 + 2]) > -0.02 ? 1 : 0;
  for (let it = 0; it < 8; it++) {
    const next = Float32Array.from(pos);
    for (let v = 0; v < nv; v++) {
      if (!band[v]) continue;
      for (let k = 0; k < 3; k++) next[v * 3 + k] = 0.5 * pos[v * 3 + k] + (0.5 * nb[v].reduce((s, u) => s + pos[u * 3 + k], 0)) / nb[v].length;
    }
    pos.set(next);
  }
  for (let v = 0; v < nv; v++) if (band[v]) for (let k = 0; k < 3; k++) pos[v * 3 + k] += n[v * 3 + k] * 0.007;
  const panel = (side) =>
    clipMesh(skinRaw.pos, pos, skinRaw.idx, (x, y, z) =>
      Math.min(shortsField(x, y, z), side === 'back' ? Math.min(-0.005 - z, y - 0.79) : -Math.min(-0.005 - z, y - 0.79)),
    );
  return {
    shorts: simplify(panel('front'), 9000, 0.004, ['LockBorder']),
    shorts_back: simplify(panel('back'), 7000, 0.004, ['LockBorder']),
  };
}
Object.assign(parts, shortsPanels());

// --- hair: short crop on the head skin (hairline higher at the forehead than at the nape)
function hairCap() {
  const n = normals(skinRaw);
  const field = (x, y, z) => {
    const line = 1.655 + 0.045 * Math.min(1, Math.max(0, (z + 0.02) / 0.1)) + 0.012 * Math.min(1, Math.abs(x) / 0.07);
    return Math.min(y - line, 0.075 - Math.abs(x) + 0.5 * Math.max(0, -z)); // keep the ears clear
  };
  const pos = Float32Array.from(skinRaw.pos);
  for (let v = 0; v < nv; v++) for (let k = 0; k < 3; k++) pos[v * 3 + k] += n[v * 3 + k] * 0.003;
  return simplify(clipMesh(skinRaw.pos, pos, skinRaw.idx, field), 5000, 0.004, ['LockBorder']);
}
parts.hair = hairCap();


// Muscles under the shorts would poke through the fabric: drop what the shorts cover.
for (const name of Object.keys(parts)) {
  if (/^(shorts|hair|abs|lats)/.test(name)) continue;
  const m = parts[name];
  const idx = [];
  for (let i = 0; i < m.idx.length; i += 3) {
    const t = [m.idx[i], m.idx[i + 1], m.idx[i + 2]];
    if (!t.every((v) => shortsField(m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]) > 0.002)) idx.push(...t);
  }
  parts[name] = { pos: m.pos, idx: new Uint32Array(idx) };
}
const skin = simplify(body, 70000, 0.01);
parts.skin = skin;


// ---------------------------------------------------------------- ambient occlusion (baked into vertex colours)

function bakeAO(parts, rays = 24, reach = 0.05) {
  const all = merge(Object.values(parts));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(all.pos, 3));
  geo.setIndex(new THREE.BufferAttribute(all.idx, 1));
  const bvh = new MeshBVH(geo);
  // Fixed cosine-weighted directions around +Y, rotated onto each normal.
  const dirs = Array.from({ length: rays }, (_, i) => {
    const u = (i + 0.5) / rays;
    const phi = i * 2.399963; // golden angle
    const r = Math.sqrt(u);
    return new THREE.Vector3(r * Math.cos(phi), Math.sqrt(1 - u), r * Math.sin(phi));
  });
  const ray = new THREE.Ray();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const nrm = new THREE.Vector3();
  const out = {};
  for (const [name, m] of Object.entries(parts)) {
    const n = normals(m);
    const col = new Float32Array(m.pos.length);
    for (let v = 0; v < m.pos.length / 3; v++) {
      nrm.set(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]);
      q.setFromUnitVectors(up, nrm);
      let open = 0;
      for (const d of dirs) {
        ray.origin.set(m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]).addScaledVector(nrm, 0.0008);
        ray.direction.copy(d).applyQuaternion(q);
        const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0.003, reach); // closer hits = intersecting layers
        open += hit ? (hit.distance - 0.003) / (reach - 0.003) : 1; // nearer occluders darken more
      }
      const ao = Math.pow(open / rays, 2.2);
      col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = 0.18 + 0.82 * ao;
    }
    out[name] = col;
  }
  return out;
}

// ---------------------------------------------------------------- write glTF

console.time('ao');
const ao = bakeAO(parts);
console.timeEnd('ao');

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('body');
let tris = 0;
for (const [name, m] of Object.entries(parts)) {
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(m.pos).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals(m)).setBuffer(buffer))
    .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(ao[name]).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(m.idx).setBuffer(buffer));
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  tris += m.idx.length / 3;
  console.log(name.padEnd(11), (m.idx.length / 3) | 0, 'tris');
}
doc.getRoot().getAsset().copyright =
  'Derived from BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution 4.0 International';
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(outFile, doc);
console.log('total', tris, 'tris ->', (fs.statSync(outFile).size / 1024).toFixed(0), 'KB');
