'use strict';
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'business.json'), 'utf8'));
module.exports = raw;
