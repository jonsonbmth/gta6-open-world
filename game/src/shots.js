// Screenshot shots: the four frames the entry is judged on.
// Each is a deterministic setup driven by ?shot=<name>&seed=1.
export const SHOTS = [
  { name: '1-chase.jpg', query: '?shot=chase&seed=1', label: 'Chase — Sunset Sprint with police on your tail' },
  { name: '2-title.jpg', query: '?shot=title&seed=1', label: 'Title — Solmar Bay at golden hour' },
  { name: '3-map.jpg', query: '?shot=map&seed=1', label: 'City map — districts, GPS route, landmarks' },
  { name: '4-marina.jpg', query: '?shot=marina&seed=1', label: 'Marina — the crew at the docks' },
];

export function shotByName(name) {
  return SHOTS.find((s) => s.query.includes(`shot=${name}`)) || null;
}
