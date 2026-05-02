const Result = require('../models/Result');

function allTwoDigitNumbers() {
  return Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
}

async function getFrequency({ region = 'MB', days = 30 }) {
  const safeDays = Math.min(Number(days) || 30, 365);
  const results = await Result.find({ region: region.toUpperCase() })
    .sort({ date: -1 })
    .limit(safeDays)
    .lean();

  const counts = Object.fromEntries(allTwoDigitNumbers().map((n) => [n, 0]));

  for (const result of results) {
    for (const number of result.twoDigits || []) {
      counts[number] = (counts[number] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number.localeCompare(b.number));
}

async function getHotCold({ region = 'MB', days = 30, size = 10 }) {
  const frequency = await getFrequency({ region, days });
  const safeSize = Math.min(Number(size) || 10, 30);

  return {
    hot: frequency.slice(0, safeSize),
    cold: [...frequency]
      .sort((a, b) => a.count - b.count || a.number.localeCompare(b.number))
      .slice(0, safeSize)
  };
}

async function getGap({ region = 'MB' }) {
  const results = await Result.find({ region: region.toUpperCase() })
    .sort({ date: -1 })
    .limit(365)
    .lean();

  const gaps = Object.fromEntries(allTwoDigitNumbers().map((n) => [n, null]));

  for (let index = 0; index < results.length; index++) {
    for (const number of results[index].twoDigits || []) {
      if (gaps[number] === null) gaps[number] = index;
    }
  }

  return Object.entries(gaps)
    .map(([number, gap]) => ({ number, gap }))
    .sort((a, b) => {
      if (a.gap === null && b.gap === null) return a.number.localeCompare(b.number);
      if (a.gap === null) return -1;
      if (b.gap === null) return 1;
      return b.gap - a.gap;
    });
}

module.exports = { getFrequency, getHotCold, getGap };
