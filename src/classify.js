'use strict';
// Applies Nikhil's five criteria (qualified.md) and services.md to a finished call.
// Deterministic so it can be tested offline. Thresholds live in config/business.json.

const cfg = require('./config');
const { isPriceQuestion } = require('./pricing');

const COMPLAINT = /(my project (has|is|was)|designer (hasn't|has not|is not)|not acceptable|not happy|unhappy|i('d| had) called (on|earlier)|someone said they'd get back|no one replied|haven't heard back|ongoing work)/i;
const PROXY = /(for my (parents|in-laws|father|mother|friend)|initial (checking|research)|just calling to see)/i;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };

const callerText = transcript => transcript.filter(t => t.role === 'caller').map(t => t.text).join(' ');
const num = s => (WORDNUM[String(s).toLowerCase()] ?? parseFloat(String(s).replace(/,/g, '')));
const has = (text, list) => list.find(k => text.toLowerCase().includes(k.toLowerCase())) || null;

function timelineWeeks(text, startedAt) {
  // Weeks or days stated outright (ignoring "possession in six weeks", which is not a deadline).
  let best = null;
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (/possession/i.test(s)) continue;
    const w = s.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*weeks?/i);
    if (w) best = Math.min(best ?? 1e9, num(w[1]));
    const d = s.match(/(\d+)\s*days?/i);
    if (d) best = Math.min(best ?? 1e9, num(d[1]) / 7);
  }
  if (best != null) return best;

  const mo = text.match(/(\d+)(?:\s*-\s*\d+)?\s*months?/i);
  if (mo) return num(mo[1]) * 4.3;

  // Named months: the latest one named is the deadline ("start October, move in November").
  const start = new Date(startedAt || Date.now());
  let far = null;
  for (let i = 0; i < 12; i++) {
    if (new RegExp('\\b' + MONTHS[i] + '\\b', 'i').test(text) && !/last\s+\w*\s*$/i.test(text.split(MONTHS[i])[0])) {
      let diff = i - start.getUTCMonth();
      if (diff <= 0) diff += 12;
      far = Math.max(far ?? 0, diff);
    }
  }
  return far != null ? far * 4.3 : null;
}

function extract(transcript, startedAt) {
  const text = callerText(transcript);
  const out = { name: null, projectKind: null, projectType: null, location: null, sqft: null, budgetLakh: null, timelineWeeks: null, priceAsked: isPriceQuestion(text) };

  const nm = text.match(/(?:my name is|this is|i am|i'm|name's)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (nm && !/^(Calling|Planning|Doing|Getting)$/.test(nm[1])) out.name = nm[1];

  if (/(office|clinic|coworking|startup|studio space)/i.test(text) && !/home office/i.test(text)) { out.projectKind = 'commercial'; out.projectType = 'Commercial'; }
  else if (/(flat|bhk|apartment|villa|home|house|living room|bedroom|kitchen)/i.test(text)) { out.projectKind = 'residential'; out.projectType = 'Residential'; }

  const low = text.toLowerCase();
  const outside = cfg.outsideServiceArea.find(p => low.includes(p.toLowerCase()));
  out.outsideArea = outside || null;
  out.location = outside || cfg.placeNames.find(p => low.includes(p.toLowerCase())) || null;

  const sq = text.match(/([\d,]{3,6})\s*(?:sq\.?\s*ft|sqft|square feet)/i);
  if (sq) out.sqft = num(sq[1]);

  const l = text.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i) || text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
  if (l) out.budgetLakh = l[2] && /to|-/.test(l[0]) ? num(l[1]) : num(l[1]); // lower end: "1 to 1.5 lakh" -> 1
  out.timelineWeeks = timelineWeeks(text, startedAt);
  return out;
}

function classify(call) {
  const text = callerText(call.transcript);
  const f = extract(call.transcript, call.startedAt);
  const q = cfg.qualification;
  const flags = [];
  const fails = [];
  const done = (outcome, reasons) => ({ outcome, fields: f, flags, reasons });

  if (COMPLAINT.test(text)) return done('Human', ['Existing client or follow-up complaint: needs a person, not the agent.']);

  const oos = has(text, cfg.outOfScope);
  if (oos) return done('Decline', [`Out of scope per services.md: "${oos}".`]);

  // The five criteria
  if (has(text, cfg.adviceOnly)) fails.push('1 Real project: caller wants advice or is only exploring.');
  if (f.outsideArea) fails.push(`2 Service area: ${f.outsideArea} is outside Pune and PCMC.`);
  if (f.timelineWeeks != null && f.timelineWeeks < q.minLeadTimeWeeks) fails.push(`3 Timeline: about ${Math.round(f.timelineWeeks)} weeks is under the ${q.minLeadTimeWeeks} week minimum.`);
  if (f.budgetLakh != null && f.budgetLakh < q.minBudgetLakh) fails.push(`4 Budget: Rs ${f.budgetLakh} lakh is clearly below any project of this scope.`);
  if (f.projectKind === 'commercial' && f.sqft && f.sqft < q.commercialMinSqft) fails.push(`Scope: ${f.sqft} sq ft is below the ${q.commercialMinSqft} sq ft commercial minimum.`);

  if (fails.length) return done('Decline', fails);
  if (!f.projectKind) return done('Decline', ['Not enough information: no project described, so not forwarded as an incomplete lead.']);

  if (!f.location) flags.push('Location not confirmed');
  if (/diwali/i.test(text) && f.timelineWeeks == null) flags.push('Festival deadline: confirm the timeline');
  if (f.timelineWeeks != null && f.timelineWeeks < q.tightBelowWeeks) flags.push('Tight timeline (6 to 8 weeks)');
  if (PROXY.test(text)) flags.push('5 Decision-maker: caller may not be the decision-maker');
  if (f.projectKind === 'commercial' && f.sqft && f.sqft > q.commercialMaxSqft) flags.push('Office above about 3,000 sq ft');

  return done(flags.length ? 'Forward with flag' : 'Forward', [flags.length ? `Passes the five criteria, with a note: ${flags.join('; ')}.` : 'Passes all five criteria.']);
}

module.exports = { classify, extract, callerText };
