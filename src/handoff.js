'use strict';
// Builds the designer handoff note: everything the agent asked, so the designer never re-asks.

const NG = 'not given';

function build(call, result) {
  const f = result.fields;
  const lines = [
    `New enquiry: ${f.name || 'Name ' + NG}`,
    `Phone: ${call.phone}${call.repeatCaller ? ' (repeat caller)' : ''}`,
    `Project: ${f.projectType || NG}`,
    `Location: ${f.location || NG}`,
    `Size: ${f.sqft ? f.sqft + ' sq ft' : NG}`,
    `Budget: ${f.budgetLakh != null ? 'Rs ' + f.budgetLakh + ' lakh (caller volunteered)' : NG}`,
    `Timeline: ${f.timelineWeeks != null ? 'about ' + Math.round(f.timelineWeeks) + ' weeks' : NG}`,
    `Consultation: ${call.bookedSlot || 'not booked, call back in working hours'}`,
    `Verdict: ${result.outcome}. ${result.reasons.join(' ')}`,
  ];
  if (result.flags.length) lines.push(`Flags: ${result.flags.join('; ')}`);
  if (f.priceAsked) lines.push('Caller asked about price: agent gave the standard "your designer will explain" reply. No figure was quoted.');
  lines.push('Already asked on the call: name, project, location, size, timeline. Do not re-ask.');
  return lines.join('\n');
}

module.exports = { build };
