'use strict';
// Generates docs/components-map.svg (swimlane map of the whole project and its deployment).  node tools/make_components_map.js
const fs = require('fs');
const path = require('path');

const W = 1434, HEAD = 70, LABEL = 175, LANE = 135, COLW = (W - LABEL - 15) / 6;
const cols = ['Trigger', 'Input', 'Context', 'Processing', 'AI', 'Output'];
const lanes = [
  ['Caller', 'Prospect'],
  ['Vaani', 'Voice agent'],
  ['Cal.com', 'Booking'],
  ['Server', 'Vercel + rules'],
  ['Designers', 'Telegram'],
  ['Nikhil', 'Dashboard'],
];
const C = {
  grey:   { f: '#f3f0ea', s: '#6b6760', t: '#33312d' },
  purple: { f: '#eeeafc', s: '#4f46c8', t: '#352b8f' },
  green:  { f: '#e4f5ee', s: '#0f7a5a', t: '#0b4f3a' },
  blue:   { f: '#e6f0fb', s: '#1f5fa8', t: '#123f73' },
  orange: { f: '#fbebd5', s: '#9a5a12', t: '#633708' },
  red:    { f: '#fbe9e4', s: '#a3361c', t: '#6b2412' },
  lime:   { f: '#e8f4dc', s: '#3f7a12', t: '#264d0a' },
  faint:  { f: '#ffffff', s: '#b9b5ad', t: '#7a766e' },
};
const bw = 182, bh = 100;
const cx = c => LABEL + COLW * (c + 0.5);
const cy = r => HEAD + LANE * (r + 0.5);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const boxes = {
  caller:  { c: 0, r: 0, col: 'grey',   a: 'Phones', b: 'Aangan, any hour' },
  vIn:     { c: 1, r: 1, col: 'purple', a: 'Answers, asks', b: 'one question at a time' },
  vAI:     { c: 4, r: 1, col: 'orange', a: 'Gemini 3.5 Flash', b: 'brain inside Vaani' },
  cal:     { c: 2, r: 2, col: 'green',  a: 'Offers free slots', b: 'books 30-min consult' },
  calOut:  { c: 5, r: 2, col: 'green',  a: 'Calendar + Gmail', b: 'Cal.com confirmation' },
  srvIn:   { c: 3, r: 3, col: 'blue',   a: 'Receives call', b: '+ transcript' },
  srvAI:   { c: 4, r: 3, col: 'faint',  a: 'No AI here', b: 'plain rules only', dashed: true },
  srvOut:  { c: 5, r: 3, col: 'blue',   a: 'Rules decide, save', b: '5 criteria, Supabase' },
  desk:    { c: 5, r: 4, col: 'red',    a: 'Telegram lead', b: 'Claim + transcript' },
  notBuilt:{ c: 3, r: 4, col: 'faint',  a: 'Not built (optional)', b: 'HubSpot, own email', dashed: true },
  nikhil:  { c: 5, r: 5, col: 'lime',   a: 'Dashboard', b: 'totals, cost, transcripts' },
};

// arrows: [from, to, route]  route: 'hv' = horizontal then vertical, 'vh' = vertical then horizontal, 'h', 'v'
const arrows = [
  ['caller', 'vIn', 'hv'],
  ['vIn', 'vAI', 'h'],
  ['vIn', 'cal', 'hv'],
  ['cal', 'calOut', 'h'],
  ['cal', 'srvIn', 'hv'],
  ['srvIn', 'srvAI', 'h'],
  ['srvAI', 'srvOut', 'h'],
  ['srvOut', 'desk', 'v'],
  ['desk', 'nikhil', 'v'],
];

let s = '';
const out = x => { s += x + '\n'; };
const BAND = 300;
const H = HEAD + LANE * lanes.length + BAND;

out(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, Helvetica, Arial, sans-serif">`);
out(`<title>Aangan Studio phone enquiry agent: components map and deployment</title>`);
out(`<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6b7280"/></marker></defs>`);
out(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
out(`<rect x="0" y="0" width="${W}" height="${HEAD}" fill="#1f2a3a"/>`);
out(`<text x="${LABEL / 2}" y="${HEAD / 2 + 6}" text-anchor="middle" font-size="19" fill="#9aa5b5">Actor</text>`);
cols.forEach((n, i) => out(`<text x="${cx(i)}" y="${HEAD / 2 + 8}" text-anchor="middle" font-size="25" font-weight="700" fill="#ffffff">${n}</text>`));

lanes.forEach((l, r) => {
  const y = HEAD + LANE * r;
  out(`<rect x="${LABEL}" y="${y}" width="${W - LABEL}" height="${LANE}" fill="${r % 2 ? '#f5f3ee' : '#ffffff'}"/>`);
  out(`<rect x="0" y="${y}" width="${LABEL}" height="${LANE}" fill="#1f2a3a"/>`);
  out(`<text x="${LABEL / 2}" y="${y + LANE / 2 - 2}" text-anchor="middle" font-size="25" font-weight="700" fill="#ffffff">${esc(l[0])}</text>`);
  out(`<text x="${LABEL / 2}" y="${y + LANE / 2 + 26}" text-anchor="middle" font-size="19" fill="#aab4c3">${esc(l[1])}</text>`);
});
for (let i = 1; i <= 6; i++) out(`<line x1="${LABEL + COLW * i - (i === 6 ? 15 : 0)}" y1="${HEAD}" x2="${LABEL + COLW * i - (i === 6 ? 15 : 0)}" y2="${HEAD + LANE * lanes.length}" stroke="#d9d5cc" stroke-width="1.5"/>`);

const edge = (b, side) => {
  const x = cx(b.c), y = cy(b.r);
  return { l: [x - bw / 2, y], r: [x + bw / 2, y], t: [x, y - bh / 2], b: [x, y + bh / 2] }[side];
};
arrows.forEach(([f, t, mode]) => {
  const A = boxes[f], B = boxes[t];
  let d;
  if (mode === 'h') { const p = edge(A, 'r'), q = edge(B, 'l'); d = `M${p[0]},${p[1]} L${q[0]},${q[1]}`; }
  else if (mode === 'v') { const p = edge(A, 'b'), q = edge(B, 't'); d = `M${p[0]},${p[1]} L${q[0]},${q[1]}`; }
  else { const p = edge(A, 'r'), q = edge(B, 't'); d = `M${p[0]},${p[1]} L${q[0]},${p[1]} L${q[0]},${q[1]}`; }
  out(`<path d="${d}" fill="none" stroke="#6b7280" stroke-width="2.4" stroke-dasharray="7 5" marker-end="url(#ah)"/>`);
});

Object.values(boxes).forEach(b => {
  const k = C[b.col], x = cx(b.c) - bw / 2, y = cy(b.r) - bh / 2;
  out(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="12" fill="${k.f}" stroke="${k.s}" stroke-width="3"${b.dashed ? ' stroke-dasharray="6 5"' : ''}/>`);
  out(`<text x="${cx(b.c)}" y="${cy(b.r) - 6}" text-anchor="middle" font-size="19" font-weight="700" fill="${k.t}">${esc(b.a)}</text>`);
  out(`<text x="${cx(b.c)}" y="${cy(b.r) + 22}" text-anchor="middle" font-size="17" fill="${k.t}" opacity="0.85">${esc(b.b)}</text>`);
});

// ---- deployment band
const by = HEAD + LANE * lanes.length;
out(`<rect x="0" y="${by}" width="${W}" height="${BAND}" fill="#f7f6f2"/>`);
out(`<line x1="0" y1="${by}" x2="${W}" y2="${by}" stroke="#cfcac0" stroke-width="2"/>`);
out(`<text x="30" y="${by + 36}" font-size="22" font-weight="700" fill="#1f2a3a">Where it runs (deployment)</text>`);
const chip = (x, y, w, h, col, a, b, dashed) => {
  const k = C[col];
  out(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${k.f}" stroke="${k.s}" stroke-width="2.5"${dashed ? ' stroke-dasharray="6 5"' : ''}/>`);
  out(`<text x="${x + w / 2}" y="${y + 29}" text-anchor="middle" font-size="17" font-weight="700" fill="${k.t}">${esc(a)}</text>`);
  out(`<text x="${x + w / 2}" y="${y + 53}" text-anchor="middle" font-size="14.5" fill="${k.t}" opacity="0.85">${esc(b)}</text>`);
};
const arrow = (x1, y1, x2, y2) => out(`<path d="M${x1},${y1} L${x2},${y2}" stroke="#6b7280" stroke-width="2.4" stroke-dasharray="7 5" marker-end="url(#ah)"/>`);
const cy1 = by + 100, ch = 70;
chip(30, cy1, 270, ch, 'grey', 'GitHub (private repo)', 'ishaanpanchal-svg/aangan-phone-agent');
arrow(300, cy1 + ch / 2, 360, cy1 + ch / 2);
out(`<text x="330" y="${cy1 - 8}" text-anchor="middle" font-size="13" fill="#6b6760">push = deploy</text>`);
chip(360, cy1, 330, ch, 'blue', 'Vercel (free plan)', 'aangan-phone-agent-blond.vercel.app');
arrow(690, cy1 + ch / 2, 750, cy1 + ch / 2);
out(`<text x="720" y="${cy1 - 8}" text-anchor="middle" font-size="13" fill="#6b6760">reads / writes</text>`);
chip(750, cy1, 270, ch, 'green', 'Supabase (free plan)', 'table calls: every call + transcript');
chip(1060, cy1, 340, ch, 'purple', 'Vaani + Cal.com + Telegram', 'agent, 30-min meeting, Aangan Designers group');

const ly = by + 205;
const note = (y, bold, text) => out(`<text x="30" y="${y}" font-size="15" fill="#33312d"><tspan font-weight="700">${esc(bold)}</tspan> ${esc(text)}</text>`);
note(ly, 'Webhooks into Vercel:', 'Vaani sends each finished call to /webhook/vaani (secret key in the address).');
note(ly + 21, '', 'Telegram sends Claim presses to /telegram/webhook (secret token). The server asks Cal.com whether a booking really exists.');
note(ly + 46, 'Not built / open:', 'HubSpot lead, our own "booked" email (needs Resend), a real Indian phone number (browser test calls only).');
note(ly + 67, '', 'Vercel free plan runs timers once a day, so the 30-minute reminder fires when the site is used.');
out(`<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="16" fill="#6b6760">Aangan Studio phone enquiry agent: components map and deployment</text>`);
out('</svg>');

const file = path.join(__dirname, '..', 'docs', 'components-map.svg');
fs.writeFileSync(file, s);
console.log('wrote', file, W + 'x' + H);
