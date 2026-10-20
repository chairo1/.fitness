// Usage: node inventory.mjs <bp3d-raw dir>
// Classifies every is-a element OBJ as muscle / bone / other via the is-a hierarchy,
// and writes inventory.json: [{ file, names[], kind, bbox, verts }]
import fs from 'node:fs';
import path from 'node:path';

const raw = process.argv[2];
const read = (f) =>
  fs.readFileSync(path.join(raw, f), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split('\t'));

const parents = new Map(); // child id -> [parent id]
const nameOf = new Map();
for (const [pid, pname, cid, cname] of read('isa_inclusion_relation_list.txt')) {
  nameOf.set(pid, pname);
  nameOf.set(cid, cname);
  if (!parents.has(cid)) parents.set(cid, []);
  parents.get(cid).push(pid);
}
const ancestors = (id, seen = new Set()) => {
  for (const p of parents.get(id) ?? []) if (!seen.has(p)) (seen.add(p), ancestors(p, seen));
  return seen;
};
const isA = (id, rootName) => [...ancestors(id)].some((a) => nameOf.get(a) === rootName);

const byFile = new Map();
for (const [cid, cname, file] of read('isa_element_parts.txt')) {
  nameOf.set(cid, cname);
  if (!byFile.has(file)) byFile.set(file, { file, ids: new Set(), names: new Set() });
  byFile.get(file).ids.add(cid);
  byFile.get(file).names.add(cname);
}

const objDir = path.join(raw, 'isa', fs.readdirSync(path.join(raw, 'isa'))[0]);
const out = [];
for (const e of byFile.values()) {
  const ids = [...e.ids];
  const kind = ids.some((i) => isA(i, 'muscle organ') || isA(i, 'head of muscle organ') || isA(i, 'zone of muscle organ'))
    ? 'muscle'
    : ids.some((i) => isA(i, 'bone organ') || /bone|vertebra|rib\b|sternum|patella|phalanx|skull|mandible|clavicle|scapula|pelvi|sacrum|femur|tibia|fibula|humerus|radius|ulna|carpal|tarsal/.test(nameOf.get(i)))
      ? 'bone'
      : 'other';
  const objPath = path.join(objDir, `${e.file}.obj`);
  if (!fs.existsSync(objPath)) continue;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let verts = 0;
  for (const line of fs.readFileSync(objPath, 'utf8').split('\n')) {
    if (!line.startsWith('v ')) continue;
    const v = line.slice(2).trim().split(/\s+/).map(Number);
    for (let k = 0; k < 3; k++) (min[k] = Math.min(min[k], v[k])), (max[k] = Math.max(max[k], v[k]));
    verts++;
  }
  out.push({ file: e.file, names: [...e.names].sort((a, b) => a.length - b.length), kind, min, max, verts });
}
fs.writeFileSync(path.join(raw, 'inventory.json'), JSON.stringify(out));
const count = (k) => out.filter((o) => o.kind === k);
console.log('files', out.length, 'muscle', count('muscle').length, 'bone', count('bone').length, 'other', count('other').length);
const all = out.reduce(
  (a, o) => ({ min: a.min.map((m, k) => Math.min(m, o.min[k])), max: a.max.map((m, k) => Math.max(m, o.max[k])) }),
  { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] },
);
console.log('bbox', all.min.map(Math.round), all.max.map(Math.round));
console.log('muscle verts', count('muscle').reduce((s, o) => s + o.verts, 0), 'bone verts', count('bone').reduce((s, o) => s + o.verts, 0));
console.log('sample other:', count('other').slice(0, 15).map((o) => o.names[0]).join(' | '));
