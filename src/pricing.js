'use strict';
// pricing.md: "No number from this guide should be quoted." The only reply to a price question is the deflection.
const cfg = require('./config');

const PRICE_QUESTION = /(how much|cost|price|pricing|per sq ?ft|rate|ballpark|charge|quote)/i;

const isPriceQuestion = text => PRICE_QUESTION.test(text);
const priceReply = () => cfg.pricingDeflection;

// Nothing headed for a designer or the database may contain a studio rate (e.g. "Rs 1,800 per sq ft").
function stripPrices(obj) {
  return !/per sq ?ft|\/ ?sq ?ft|₹\s?\d|rs\.? ?\d{1,3}(,\d{3})+/i.test(JSON.stringify(obj));
}

module.exports = { priceReply, isPriceQuestion, stripPrices };
