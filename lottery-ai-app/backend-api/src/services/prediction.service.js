const Prediction = require('../models/Prediction');
const Province = require('../models/Province');
const LotteryNumber = require('../models/LotteryNumber');
const Result = require('../models/Result');
const mlModelService = require('./mlModel.service');
const { loadModel } = require('./mlModel.service');
const patternTransitionService = require('./patternTransition.service');

const AREAS = {
  SOUTH: 'mien_nam',
  CENTRAL: 'mien_trung',
  NORTH: 'mien_bac'
};

const DEFAULT_WEIGHTS = {
  southHotScore: 0.18,
  centralRepeatScore: 0.14,
  northRecentScore: 0.1,
  cascadeScore: 0.2,
  gapCycleScore: 0.07,
  markovScore: 0.06,
  patternTransitionScore: 0.1,
  mlScore: 0.15
};

function allTwoDigitNumbers() {
  return Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
}

function toDateString(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function normalizeTopK(value) {
  return Math.min(Math.max(Number(value) || 10, 1), 100);
}

function normalizeDateRangeDays(value) {
  return Math.min(Math.max(Number(value) || 14, 3), 3650);
}

function normalizeScore(value, max) {
  if (!max || max <= 0) return 0;
  return Number((value / max).toFixed(4));
}

function confidenceLevel(score) {
  if (score >= 0.75) return 'cao';
  if (score >= 0.55) return 'trung_binh';
  return 'thap';
}

function buildReason(features) {
  const reasons = [];

  if (features.southHotScore > 0) reasons.push('Có tín hiệu tần suất ở Miền Nam');
  if (features.centralRepeatScore > 0) reasons.push('Có lặp/xác nhận ở Miền Trung');
  if (features.northRecentScore > 0) reasons.push('Miền Bắc gần đây có xuất hiện');
  if (features.cascadeScore >= 0.5) reasons.push('Đạt rule cascade Nam → Trung → Bắc');
  if (features.gapCycleScore >= 0.7) reasons.push('Chu kỳ/gap đang ở vùng đáng chú ý');
  if (features.markovScore > 0.5) reasons.push('Markov repeat score tốt');

  if (features.patternTransitionScore >= 0.6) {
    reasons.push('Pattern vắng đầu/đuôi hôm nay đang ủng hộ số này');
  }

  if (features.mlScore > 0.6) reasons.push('Machine Learning score đang ủng hộ');

  return reasons.join('; ') || 'Điểm tổng hợp từ thống kê lịch sử';
}

async function latestAvailableDate() {
  const latest = await Result.findOne({})
    .sort({ drawDate: -1, date: -1 })
    .select('date')
    .lean();

  return latest?.date || toDateString();
}

async function dateWindow({ endDate, days }) {
  const results = await Result.find({ date: { $lte: endDate } })
    .sort({ drawDate: -1, date: -1 })
    .limit(days * 40)
    .select('date')
    .lean();

  return [...new Set(results.map((r) => r.date))].slice(0, days);
}

async function countByAreaAndDates({ area, dates, isSpecial = false }) {
  if (!dates.length) return {};

  const rows = await LotteryNumber.aggregate([
    {
      $match: {
        area,
        date: { $in: dates },
        last2: { $ne: null },
        ...(isSpecial ? { isSpecial: true } : {})
      }
    },
    {
      $group: {
        _id: '$last2',
        count: { $sum: 1 }
      }
    }
  ]);

  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

async function numbersByAreaAndDate({ area, date }) {
  const rows = await LotteryNumber.find({
    area,
    date,
    last2: { $ne: null }
  })
    .select('last2')
    .lean();

  return rows.map((row) => row.last2);
}

async function calculateGaps({ area, endDate, maxDays = 365 }) {
  const dates = await dateWindow({ endDate, days: maxDays });
  const gaps = Object.fromEntries(allTwoDigitNumbers().map((n) => [n, null]));

  for (let index = 0; index < dates.length; index += 1) {
    const rows = await LotteryNumber.find({
      area,
      date: dates[index],
      last2: { $ne: null }
    })
      .select('last2')
      .lean();

    for (const row of rows) {
      if (row.last2 && gaps[row.last2] === null) {
        gaps[row.last2] = index;
      }
    }
  }

  return gaps;
}

function gapCycleScore(gap) {
  if (gap === null) return 0.65;
  if (gap <= 1) return 0.45;
  if (gap <= 3) return 0.8;
  if (gap <= 7) return 1;
  if (gap <= 14) return 0.75;
  if (gap <= 30) return 0.55;
  return 0.35;
}

async function calculateMarkovRepeatScores({ area, endDate, days }) {
  const dates = await dateWindow({ endDate, days: days + 1 });
  const ascDates = [...dates].sort();
  const dateSetMap = new Map();

  for (const date of ascDates) {
    dateSetMap.set(date, new Set(await numbersByAreaAndDate({ area, date })));
  }

  const stats = Object.fromEntries(
    allTwoDigitNumbers().map((n) => [n, { previousHits: 0, repeatHits: 0 }])
  );

  for (let i = 0; i < ascDates.length - 1; i += 1) {
    const currentSet = dateSetMap.get(ascDates[i]) || new Set();
    const nextSet = dateSetMap.get(ascDates[i + 1]) || new Set();

    for (const num of currentSet) {
      stats[num].previousHits += 1;
      if (nextSet.has(num)) stats[num].repeatHits += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(stats).map(([num, stat]) => [
      num,
      stat.previousHits
        ? Number((stat.repeatHits / stat.previousHits).toFixed(4))
        : 0.5
    ])
  );
}

async function resolvePredictionStation({ area, province, code, region } = {}) {
  const normalizedCode = String(code || region || 'XSMB').toUpperCase();
  const station = await Province.findOne({
    code: normalizedCode,
    active: true
  }).lean();

  return {
    area: area || station?.area || AREAS.NORTH,
    province:
      province ||
      station?.province ||
      (normalizedCode === 'XSMB' ? 'Miền Bắc' : normalizedCode),
    code: normalizedCode
  };
}

async function buildCandidateFeatureRows({ signalDate, target, recentDays }) {
  const recentDates = await dateWindow({
    endDate: signalDate,
    days: recentDays
  });

  const southTodayCounts = await countByAreaAndDates({
    area: AREAS.SOUTH,
    dates: [signalDate]
  });

  const centralTodayNumbers = new Set(
    await numbersByAreaAndDate({
      area: AREAS.CENTRAL,
      date: signalDate
    })
  );

  const northRecentCounts = await countByAreaAndDates({
    area: target.area,
    dates: recentDates
  });

  const gaps = await calculateGaps({
    area: target.area,
    endDate: signalDate,
    maxDays: Math.min(recentDays * 8, 365)
  });

  const markovScores = await calculateMarkovRepeatScores({
    area: target.area,
    endDate: signalDate,
    days: recentDays
  });

  const patternScores =
    await patternTransitionService.calculatePatternTransitionScores({
      area: target.area,
      signalDate,
      trainDays: Math.max(recentDays * 8, 120)
    });

  const maxSouth = Math.max(...Object.values(southTodayCounts), 1);
  const maxNorthRecent = Math.max(...Object.values(northRecentCounts), 1);

  return allTwoDigitNumbers().map((number) => {
    const southHotScore = normalizeScore(southTodayCounts[number] || 0, maxSouth);
    const centralRepeatScore = centralTodayNumbers.has(number) ? 1 : 0;
    const northRecentScore = normalizeScore(
      northRecentCounts[number] || 0,
      maxNorthRecent
    );

    const cascadeScore = Number(
      (
        0.5 * southHotScore +
        0.3 * centralRepeatScore +
        0.2 * northRecentScore
      ).toFixed(4)
    );

    const gScore = gapCycleScore(gaps[number]);
    const markovScore = markovScores[number] ?? 0.5;

    const pattern = patternScores[number] || {};
    const headAbsentScore = pattern.headAbsentScore || 0;
    const tailAbsentScore = pattern.tailAbsentScore || 0;
    const patternTransitionScore = pattern.patternTransitionScore || 0;

    return {
      number,
      features: {
        southHotScore,
        centralRepeatScore,
        northRecentScore,
        cascadeScore,
        gap: gaps[number],
        gapCycleScore: gScore,
        markovScore,

        headAbsentScore,
        tailAbsentScore,
        patternTransitionScore,
        absentHeadsToday: pattern.absentHeadsToday || [],
        absentTailsToday: pattern.absentTailsToday || []
      }
    };
  });
}

async function generateTemporalPrediction(payload = {}) {
  const topK = normalizeTopK(payload.topK);
  const recentDays = normalizeDateRangeDays(payload.recentDays);
  const signalDate = payload.signalDate
    ? toDateString(payload.signalDate)
    : await latestAvailableDate();

  const predictDate = payload.predictDate
    ? toDateString(payload.predictDate)
    : addDays(signalDate, 1);

  const target = await resolvePredictionStation(payload);

  const modelDoc = await loadModel(target.code);
  const mlModel = modelDoc ? modelDoc.model : null;

  const candidateRows = await buildCandidateFeatureRows({
    signalDate,
    target,
    recentDays
  });

  const numbers = candidateRows
    .map(({ number, features }) => {
      const mlScore = mlModel
        ? mlModelService.predictWithModel(mlModel, features)
        : 0.5;

      const score = Number(
        (
          DEFAULT_WEIGHTS.southHotScore * features.southHotScore +
          DEFAULT_WEIGHTS.centralRepeatScore * features.centralRepeatScore +
          DEFAULT_WEIGHTS.northRecentScore * features.northRecentScore +
          DEFAULT_WEIGHTS.cascadeScore * features.cascadeScore +
          DEFAULT_WEIGHTS.gapCycleScore * features.gapCycleScore +
          DEFAULT_WEIGHTS.markovScore * features.markovScore +
          DEFAULT_WEIGHTS.patternTransitionScore *
            features.patternTransitionScore +
          DEFAULT_WEIGHTS.mlScore * mlScore
        ).toFixed(4)
      );

      const enrichedFeatures = {
        ...features,
        mlScore
      };

      return {
        number,
        score,
        confidenceLevel: confidenceLevel(score),
        reason: buildReason(enrichedFeatures),
        features: enrichedFeatures
      };
    })
    .sort((a, b) => b.score - a.score || a.number.localeCompare(b.number))
    .slice(0, topK);

  const prediction = await Prediction.findOneAndUpdate(
    {
      date: predictDate,
      code: target.code
    },
    {
      date: predictDate,
      area: target.area,
      province: target.province,
      code: target.code,
      region: target.code,
      numbers: numbers.map((item) => ({
        number: item.number,
        score: item.score,
        reason: item.reason
      })),
      model: modelDoc
        ? `mongodb:${modelDoc.modelVersion}`
        : 'temporal_cascade_rule_v3_no_ml_model'
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  ).lean();

  return {
    prediction,
    meta: {
      signalDate,
      predictDate,
      target,
      recentDays,
      temporalOrder: [AREAS.SOUTH, AREAS.CENTRAL, AREAS.NORTH],
      weights: DEFAULT_WEIGHTS,
      mlModel: modelDoc
        ? {
            source: 'mongodb',
            version: modelDoc.modelVersion,
            trainedAt: modelDoc.trainedAt,
            metrics: modelDoc.metrics
          }
        : null,
      note: 'Chỉ là xếp hạng xác suất tương đối theo thống kê, không đảm bảo trúng thưởng.'
    },
    numbers
  };
}

async function generatePrediction(payload = {}) {
  return generateTemporalPrediction(payload);
}

async function getTodayPrediction(payload = {}) {
  const target = await resolvePredictionStation(payload);
  const today = toDateString(payload.date);

  return Prediction.findOne({
    date: today,
    code: target.code
  }).lean();
}

module.exports = {
  generatePrediction,
  generateTemporalPrediction,
  getTodayPrediction,
  buildCandidateFeatureRows,
  resolvePredictionStation,
  addDays,
  toDateString,
  allTwoDigitNumbers
};