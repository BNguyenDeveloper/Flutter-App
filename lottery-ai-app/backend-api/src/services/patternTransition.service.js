const LotteryNumber = require('../models/LotteryNumber');
const Result = require('../models/Result');

function allTwoDigitNumbers() {
  return Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
}

function getHead(num) {
  return String(num).padStart(2, '0')[0];
}

function getTail(num) {
  return String(num).padStart(2, '0')[1];
}

async function getDateWindow({ endDate, days }) {
  const rows = await Result.aggregate([
    { $match: { date: { $lte: endDate } } },
    { $group: { _id: '$date' } },
    { $sort: { _id: -1 } },
    { $limit: days }
  ]);

  return rows.map((r) => r._id).sort();
}

async function getNumbersByAreaDate({ area, date }) {
  const rows = await LotteryNumber.find({
    area,
    date,
    last2: { $ne: null }
  })
    .select('last2')
    .lean();

  return rows.map((r) => r.last2);
}

function buildAbsentState(numbers = []) {
  const set = new Set(numbers);

  const headsPresent = new Set();
  const tailsPresent = new Set();

  for (const num of set) {
    headsPresent.add(getHead(num));
    tailsPresent.add(getTail(num));
  }

  const absentHeads = [];
  const absentTails = [];

  for (let i = 0; i <= 9; i += 1) {
    const digit = String(i);

    if (!headsPresent.has(digit)) absentHeads.push(digit);
    if (!tailsPresent.has(digit)) absentTails.push(digit);
  }

  return {
    absentHeads,
    absentTails
  };
}

function normalize(value, max) {
  if (!max || max <= 0) return 0;
  return Number((value / max).toFixed(4));
}

async function buildPatternTransitionStats({
  area,
  endDate,
  days = 120
}) {
  const dates = await getDateWindow({
    endDate,
    days: days + 1
  });

  const stats = {
    headAbsentToNumber: {},
    tailAbsentToNumber: {}
  };

  for (let i = 0; i < dates.length - 1; i += 1) {
    const today = dates[i];
    const tomorrow = dates[i + 1];

    const todayNumbers = await getNumbersByAreaDate({ area, date: today });
    const tomorrowNumbers = await getNumbersByAreaDate({ area, date: tomorrow });

    if (!todayNumbers.length || !tomorrowNumbers.length) continue;

    const state = buildAbsentState(todayNumbers);

    for (const head of state.absentHeads) {
      if (!stats.headAbsentToNumber[head]) {
        stats.headAbsentToNumber[head] = {};
      }

      for (const num of tomorrowNumbers) {
        stats.headAbsentToNumber[head][num] =
          (stats.headAbsentToNumber[head][num] || 0) + 1;
      }
    }

    for (const tail of state.absentTails) {
      if (!stats.tailAbsentToNumber[tail]) {
        stats.tailAbsentToNumber[tail] = {};
      }

      for (const num of tomorrowNumbers) {
        stats.tailAbsentToNumber[tail][num] =
          (stats.tailAbsentToNumber[tail][num] || 0) + 1;
      }
    }
  }

  return stats;
}

function scoreFromTransitionMap(map = {}, number) {
  const max = Math.max(...Object.values(map), 0);
  return normalize(map[number] || 0, max);
}

async function calculatePatternTransitionScores({
  area,
  signalDate,
  trainDays = 120
}) {
  const todayNumbers = await getNumbersByAreaDate({
    area,
    date: signalDate
  });

  const todayState = buildAbsentState(todayNumbers);

  const stats = await buildPatternTransitionStats({
    area,
    endDate: signalDate,
    days: trainDays
  });

  const scores = {};

  for (const number of allTwoDigitNumbers()) {
    let headAbsentScore = 0;
    let tailAbsentScore = 0;

    for (const absentHead of todayState.absentHeads) {
      const map = stats.headAbsentToNumber[absentHead] || {};
      headAbsentScore = Math.max(
        headAbsentScore,
        scoreFromTransitionMap(map, number)
      );
    }

    for (const absentTail of todayState.absentTails) {
      const map = stats.tailAbsentToNumber[absentTail] || {};
      tailAbsentScore = Math.max(
        tailAbsentScore,
        scoreFromTransitionMap(map, number)
      );
    }

    const patternTransitionScore = Number(
      (
        0.55 * headAbsentScore +
        0.45 * tailAbsentScore
      ).toFixed(4)
    );

    scores[number] = {
      headAbsentScore,
      tailAbsentScore,
      patternTransitionScore,
      absentHeadsToday: todayState.absentHeads,
      absentTailsToday: todayState.absentTails
    };
  }

  return scores;
}

module.exports = {
  calculatePatternTransitionScores,
  buildAbsentState,
  buildPatternTransitionStats
};