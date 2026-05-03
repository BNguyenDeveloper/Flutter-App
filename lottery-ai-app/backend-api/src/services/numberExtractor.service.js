const LotteryNumber = require('../models/LotteryNumber');

const PRIZE_ORDER = ['db', 'g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1'];

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizePrizeKey(key) {
  const k = String(key).trim().toLowerCase();
  if (['special', 'gdb', 'g.db', 'db', 'đb'].includes(k)) return 'db';
  if (['first', 'g1'].includes(k)) return 'g1';
  if (['second', 'g2'].includes(k)) return 'g2';
  if (['third', 'g3'].includes(k)) return 'g3';
  if (['fourth', 'g4'].includes(k)) return 'g4';
  if (['fifth', 'g5'].includes(k)) return 'g5';
  if (['sixth', 'g6'].includes(k)) return 'g6';
  if (['seventh', 'g7'].includes(k)) return 'g7';
  if (['eighth', 'g8'].includes(k)) return 'g8';
  return k;
}

function normalizePrizes(prizes = {}) {
  const normalized = {};

  for (const [key, rawValue] of Object.entries(prizes || {})) {
    const prize = normalizePrizeKey(key);
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    normalized[prize] = values.map(onlyDigits).filter(Boolean);
  }

  const ordered = {};
  for (const key of PRIZE_ORDER) {
    if (normalized[key]?.length) ordered[key] = normalized[key];
  }
  for (const [key, values] of Object.entries(normalized)) {
    if (!ordered[key]) ordered[key] = values;
  }

  return ordered;
}

function extractOneNumber({ result, prize, fullNumber }) {
  const n = onlyDigits(fullNumber);
  if (!n) return null;

  return {
    resultId: result._id,
    area: result.area,
    province: result.province,
    code: result.code,
    date: result.date,
    drawDate: result.drawDate,
    prize,
    fullNumber: n,
    last2: n.length >= 2 ? n.slice(-2) : null,
    last3: n.length >= 3 ? n.slice(-3) : null,
    head2: n.length >= 2 ? n.slice(0, 2) : null,
    head3: n.length >= 3 ? n.slice(0, 3) : null,
    isSpecial: prize === 'db'
  };
}

function extractLotteryNumbers(result) {
  const prizes = normalizePrizes(result.prizes);
  const docs = [];

  for (const [prize, numbers] of Object.entries(prizes)) {
    for (const fullNumber of numbers) {
      const doc = extractOneNumber({ result, prize, fullNumber });
      if (doc) docs.push(doc);
    }
  }

  return docs;
}

function extractTwoDigitsFromPrizes(prizes = {}) {
  const normalized = normalizePrizes(prizes);
  const twoDigits = [];

  for (const numbers of Object.values(normalized)) {
    for (const number of numbers) {
      const n = onlyDigits(number);
      if (n.length >= 2) twoDigits.push(n.slice(-2));
    }
  }

  return twoDigits;
}

async function rebuildNumbersForResult(result) {
  await LotteryNumber.deleteMany({ resultId: result._id });
  const docs = extractLotteryNumbers(result);
  if (!docs.length) return [];
  return LotteryNumber.insertMany(docs, { ordered: false });
}

module.exports = {
  normalizePrizes,
  extractLotteryNumbers,
  extractTwoDigitsFromPrizes,
  rebuildNumbersForResult
};
