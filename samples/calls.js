'use strict';
// Illustrative synthetic calls (NOT the 40 real transcripts, which were not provided).
const c = (role, text) => ({ role, text });
const base = { durationS: 120, answeredAfterS: 2 };

module.exports = {
  qualified: { ...base, callId: 's1', phone: '+919800000001', startedAt: '2026-10-05T05:00:00Z', bookedSlot: 'Mon 12 Oct, 10:00 AM IST',
    transcript: [c('agent', 'Hello, this is Aangan Studio.'), c('caller', "Hi, my name is Asha Rao. I want full interiors for my 3 BHK flat in Baner."), c('agent', 'What is the size?'), c('caller', 'About 1400 sq ft, budget 12 lakh, I need it in 4 months.')] },
  rushed: { ...base, callId: 's2', phone: '+919800000002', startedAt: '2026-10-05T17:30:00Z',
    transcript: [c('caller', "I'm Vikram Shah. Need a modular kitchen in Kothrud, 900 sq ft flat, 9 lakh, within 3 weeks.")] },
  lowBudget: { ...base, callId: 's3', phone: '+919800000003', startedAt: '2026-10-05T18:00:00Z',
    transcript: [c('caller', 'My name is Neha Joshi. Wardrobe for my flat in Wakad, 2 lakh budget, 6 months.')] },
  outOfScope: { ...base, callId: 's4', phone: '+919800000004', startedAt: '2026-10-05T19:00:00Z',
    transcript: [c('caller', 'I am planning to open a restaurant in Aundh. Can you design the interiors?')] },
  complaint: { ...base, callId: 's5', phone: '+919800000005', startedAt: '2026-10-06T04:00:00Z',
    transcript: [c('caller', "This is Ramesh Kulkarni. My project is delayed and I'm not happy, my designer is not responding.")] },
  bigOffice: { ...base, callId: 's6', phone: '+919800000006', startedAt: '2026-10-06T06:00:00Z',
    transcript: [c('caller', 'I am Priya Menon. Office interiors in Hinjewadi, 4000 sq ft, 40 lakh, 5 months.')] },
  empty: { ...base, callId: 's7', phone: '+919800000007', startedAt: '2026-10-06T07:00:00Z',
    transcript: [c('caller', 'Hello? Who is this?')] },
};
