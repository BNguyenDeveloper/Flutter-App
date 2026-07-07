const Prediction = require('../models/Prediction');
const PredictionConfig = require('../models/PredictionConfig');
const Province = require('../models/Province');
const LotteryNumber = require('../models/LotteryNumber');
const Result = require('../models/Result');
const mlModelService = require('./mlModel.service');
const { loadModel } = require('./mlModel.service');
const patternTransitionService = require('./patternTransition.service');
const advancedInferenceService = require('./advancedInference.service');

const AREAS = {
  SOUTH: 'mien_nam',
  CENTRAL: 'mien_trung',
  NORTH: 'mien_bac'
};
const DEFAULT_TOP_K = 5;
const DEFAULT_HORIZON_DAYS = 7;

const DEFAULT_WEIGHTS = {
  southHotScore: 0.18,
  centralRepeatScore: 0.14,
  northRecentScore: 0.06,
  cascadeScore: 0.28,
  gapCycleScore: 0.04,
  markovScore: 0.03,
  recencyDecayScore: 0.08,
  rollingHot7Score: 0.04,
  rollingHot30Score: 0.04,
  rollingHot60Score: 0.03,
  dayOfWeekScore: 0.03,
  pairFollowScore: 0.05,
  specialRecentScore: 0.03,
  patternTransitionScore: 0.14,
  mlScore: 0.08,
  sameDayHitPenalty: 0.08
};

function normalizeTargetType(value) {
  return value === 'special' ? 'special' : 'loto';
}

function mergeWeights(weights = {}) {
  if (weights && Object.keys(weights).length) {
    return Object.fromEntries(
      Object.keys(DEFAULT_WEIGHTS).map((key) => [key, Number(weights[key] || 0)])
    );
  }

  return {
    ...DEFAULT_WEIGHTS
  };
}

async function loadPredictionConfig({ code, targetType }) {
  const config = await PredictionConfig.findOne({
    code,
    targetType,
    active: true
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return config || null;
}

function calibrateProbability(score, calibration = {}) {
  const buckets = calibration?.buckets || [];
  if (!buckets.length) return null;

  const match = buckets.find((bucket) => score >= bucket.min && score < bucket.max);
  const fallback = buckets[buckets.length - 1];
  const bucket = match || (fallback && score >= fallback.max ? fallback : null);

  if (!bucket || !Number.isFinite(bucket.hitRate)) return null;
  return Number(bucket.hitRate.toFixed(4));
}

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
  return Math.min(Math.max(Number(value) || DEFAULT_TOP_K, 1), 100);
}

function normalizeDateRangeDays(value) {
  return Math.min(Math.max(Number(value) || 14, 3), 3650);
}

function normalizeHorizonDays(value) {
  return Math.min(Math.max(Number(value) || DEFAULT_HORIZON_DAYS, 1), 30);
}

function normalizeScore(value, max) {
  if (!max || max <= 0) return 0;
  return Number((value / max).toFixed(4));
}

function dayOfWeek(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
}

async function stationDrawsOnDate({ code, date }) {
  const normalizedCode = String(code || '').toUpperCase();
  if (!normalizedCode || !date) return false;

  const rows = await Result.find({
    code: normalizedCode,
    date: { $lt: toDateString(date) }
  })
    .sort({ drawDate: -1, date: -1 })
    .limit(260)
    .select('drawDate date')
    .lean();

  if (!rows.length) return true;

  const targetWeekday = dayOfWeek(toDateString(date));
  return rows.some((row) => {
    const drawDate = row.drawDate instanceof Date ? row.drawDate : new Date(row.drawDate);
    return drawDate.getUTCDay() === targetWeekday;
  });
}

function countNumbersFromRows(rows = []) {
  const counts = {};
  for (const row of rows) {
    counts[row.last2] = (counts[row.last2] || 0) + 1;
  }
  return counts;
}

function confidenceLevel(score) {
  if (score >= 0.75) return 'cao';
  if (score >= 0.55) return 'trung_binh';
  return 'thap';
}

function modelScoreFromAdvanced({ advancedScores, fallbackScore }) {
  if (!advancedScores || advancedScores.advancedModelScore === null) {
    return fallbackScore;
  }

  return advancedScores.advancedModelScore;
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
  if (features.advancedModelScore > 0.6) reasons.push('Advanced ensemble score is supporting this number');

  return reasons.join('; ') || 'Điểm tổng hợp từ thống kê lịch sử';
}

async function latestAvailableDate({ code, area } = {}) {
  const query = {};
  if (code) query.code = String(code).toUpperCase();
  else if (area) query.area = area;

  const latest = await Result.findOne(query)
    .sort({ drawDate: -1, date: -1 })
    .select('date')
    .lean();

  return latest?.date || toDateString();
}

async function dateWindow({ endDate, days, area, code }) {
  const query = { date: { $lte: endDate } };
  if (code) query.code = String(code).toUpperCase();
  else if (area) query.area = area;

  const results = await Result.find(query)
    .sort({ drawDate: -1, date: -1 })
    .limit(days * 40)
    .select('date')
    .lean();

  return [...new Set(results.map((r) => r.date))].slice(0, days);
}

async function countByAreaAndDates({ area, code, dates, isSpecial = false }) {
  if (!dates.length) return {};

  const rows = await LotteryNumber.aggregate([
    {
      $match: {
        area,
        ...(code ? { code: String(code).toUpperCase() } : {}),
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

async function numbersByAreaAndDate({ area, code, date }) {
  const rows = await LotteryNumber.find({
    area,
    ...(code ? { code: String(code).toUpperCase() } : {}),
    date,
    last2: { $ne: null }
  })
    .select('last2')
    .lean();

  return rows.map((row) => row.last2);
}

async function numbersByAreaDates({ area, code, dates, isSpecial = false }) {
  if (!dates.length) return [];

  return LotteryNumber.find({
    area,
    ...(code ? { code: String(code).toUpperCase() } : {}),
    date: { $in: dates },
    last2: { $ne: null },
    ...(isSpecial ? { isSpecial: true } : {})
  })
    .select('date last2')
    .lean();
}

function scoreRollingHot({ rows, windowDates }) {
  const byDate = new Set(windowDates);
  const counts = countNumbersFromRows(rows.filter((row) => byDate.has(row.date)));
  const maxCount = Math.max(...Object.values(counts), 1);
  return Object.fromEntries(
    allTwoDigitNumbers().map((number) => [
      number,
      normalizeScore(counts[number] || 0, maxCount)
    ])
  );
}

function scoreRecencyDecay({ rows, recentDates }) {
  const dateRank = new Map(recentDates.map((date, index) => [date, index + 1]));
  const scores = Object.fromEntries(allTwoDigitNumbers().map((number) => [number, 0]));

  for (const row of rows) {
    const rank = dateRank.get(row.date);
    if (!rank) continue;
    scores[row.last2] += 1 / rank;
  }

  const maxScore = Math.max(...Object.values(scores), 1);
  return Object.fromEntries(
    Object.entries(scores).map(([number, score]) => [
      number,
      normalizeScore(score, maxScore)
    ])
  );
}

async function calculateDayOfWeekScores({ area, code, signalDate, targetDate, maxDays = 365 }) {
  const weekday = dayOfWeek(targetDate);
  const dates = await dateWindow({ endDate: signalDate, days: maxDays, area, code });
  const matchedDates = dates.filter((date) => dayOfWeek(addDays(date, 1)) === weekday);
  const rows = await numbersByAreaDates({ area, code, dates: matchedDates });
  return scoreRollingHot({ rows, windowDates: matchedDates });
}

async function calculatePairFollowScores({ area, code, signalDate, maxDays = 120 }) {
  const dates = [...(await dateWindow({ endDate: signalDate, days: maxDays + 1, area, code }))].sort();
  const signalSet = new Set(await numbersByAreaAndDate({ area, code, date: signalDate }));
  const dateRows = await numbersByAreaDates({ area, code, dates });
  const byDate = new Map();

  for (const row of dateRows) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Set());
    byDate.get(row.date).add(row.last2);
  }

  const scores = Object.fromEntries(allTwoDigitNumbers().map((number) => [number, 0]));

  for (let i = 0; i < dates.length - 1; i += 1) {
    const today = byDate.get(dates[i]) || new Set();
    if (![...signalSet].some((number) => today.has(number))) continue;
    const tomorrow = byDate.get(dates[i + 1]) || new Set();
    for (const number of tomorrow) scores[number] += 1;
  }

  const maxScore = Math.max(...Object.values(scores), 1);
  return Object.fromEntries(
    Object.entries(scores).map(([number, score]) => [
      number,
      normalizeScore(score, maxScore)
    ])
  );
}

async function calculateGaps({ area, code, endDate, maxDays = 365 }) {
  const dates = await dateWindow({ endDate, days: maxDays, area, code });
  const gaps = Object.fromEntries(allTwoDigitNumbers().map((n) => [n, null]));

  for (let index = 0; index < dates.length; index += 1) {
    const rows = await LotteryNumber.find({
      area,
      ...(code ? { code: String(code).toUpperCase() } : {}),
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

async function calculateMarkovRepeatScores({ area, code, endDate, days }) {
  const dates = await dateWindow({ endDate, days: days + 1, area, code });
  const ascDates = [...dates].sort();
  const dateSetMap = new Map();

  for (const date of ascDates) {
    dateSetMap.set(date, new Set(await numbersByAreaAndDate({ area, code, date })));
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

async function buildCandidateFeatureRows({ signalDate, target, recentDays, targetDate }) {
  const recentDates = await dateWindow({
    endDate: signalDate,
    days: recentDays,
    area: target.area,
    code: target.code
  });
  const priorRecentDates = recentDates.filter((date) => date !== signalDate);

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
    code: target.code,
    dates: priorRecentDates.length ? priorRecentDates : recentDates
  });
  const targetRecentRows = await numbersByAreaDates({
    area: target.area,
    code: target.code,
    dates: priorRecentDates.length ? priorRecentDates : recentDates
  });
  const recencyDecayScores = scoreRecencyDecay({
    rows: targetRecentRows,
    recentDates: [...(priorRecentDates.length ? priorRecentDates : recentDates)].sort().reverse()
  });
  const rollingHot7Scores = scoreRollingHot({
    rows: targetRecentRows,
    windowDates: priorRecentDates.slice(0, 7)
  });
  const rollingHot30Scores = scoreRollingHot({
    rows: targetRecentRows,
    windowDates: priorRecentDates.slice(0, 30)
  });
  const rollingHot60Scores = scoreRollingHot({
    rows: targetRecentRows,
    windowDates: priorRecentDates.slice(0, 60)
  });
  const dayOfWeekScores = await calculateDayOfWeekScores({
    area: target.area,
    code: target.code,
    signalDate,
    targetDate: targetDate || addDays(signalDate, 1)
  });
  const pairFollowScores = await calculatePairFollowScores({
    area: target.area,
    code: target.code,
    signalDate
  });
  const specialRecentRows = await numbersByAreaDates({
    area: target.area,
    code: target.code,
    dates: priorRecentDates.length ? priorRecentDates : recentDates,
    isSpecial: true
  });
  const specialRecentScores = scoreRollingHot({
    rows: specialRecentRows,
    windowDates: priorRecentDates.length ? priorRecentDates : recentDates
  });

  const targetSignalNumbers = new Set(
    await numbersByAreaAndDate({
      area: target.area,
      code: target.code,
      date: signalDate
    })
  );

  const gaps = await calculateGaps({
    area: target.area,
    code: target.code,
    endDate: signalDate,
    maxDays: Math.min(recentDays * 8, 365)
  });

  const markovScores = await calculateMarkovRepeatScores({
    area: target.area,
    code: target.code,
    endDate: signalDate,
    days: recentDays
  });

  const patternScores =
    await patternTransitionService.calculatePatternTransitionScores({
      area: target.area,
      code: target.code,
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
        sameDayHitScore: targetSignalNumbers.has(number) ? 1 : 0,
        recencyDecayScore: recencyDecayScores[number] || 0,
        rollingHot7Score: rollingHot7Scores[number] || 0,
        rollingHot30Score: rollingHot30Scores[number] || 0,
        rollingHot60Score: rollingHot60Scores[number] || 0,
        dayOfWeekScore: dayOfWeekScores[number] || 0,
        pairFollowScore: pairFollowScores[number] || 0,
        specialRecentScore: specialRecentScores[number] || 0,

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
  const horizonDays = normalizeHorizonDays(payload.horizonDays);
  const targetType = normalizeTargetType(payload.targetType);
  const target = await resolvePredictionStation(payload);
  const signalDate = payload.signalDate
    ? toDateString(payload.signalDate)
    : await latestAvailableDate(target);

  const predictDate = payload.predictDate
    ? toDateString(payload.predictDate)
    : addDays(signalDate, 1);
  const validUntil = addDays(predictDate, horizonDays - 1);

  const predictionConfig = await loadPredictionConfig({
    code: target.code,
    targetType
  });
  const activeWeights = mergeWeights(predictionConfig?.weights);

  const modelDoc = await loadModel(target.code, { targetType });
  const mlModel = modelDoc ? modelDoc.model : null;

  const horizonDates = Array.from({ length: horizonDays }, (_, index) =>
    addDays(predictDate, index)
  );
  const candidateRows = await buildCandidateFeatureRows({
    signalDate,
    target,
    recentDays,
    targetDate: predictDate
  });
  const candidateRowsByDate = [
    {
      targetDate: predictDate,
      rows: candidateRows
    }
  ];

  for (const targetDate of horizonDates.slice(1)) {
    const dayOfWeekScores = await calculateDayOfWeekScores({
      area: target.area,
      code: target.code,
      signalDate,
      targetDate
    });

    candidateRowsByDate.push({
      targetDate,
      rows: candidateRows.map(({ number, features }) => ({
        number,
        features: {
          ...features,
          dayOfWeekScore: dayOfWeekScores[number] || 0
        }
      }))
    });
  }

  const advancedInference = await advancedInferenceService.fetchAdvancedScores({
    target,
    signalDate,
    predictDate,
    recentDays,
    candidateRows,
    localModelVersion: modelDoc?.modelVersion || null
  });

  const bestByNumber = new Map();

  for (const { targetDate, rows } of candidateRowsByDate) {
    for (const { number, features } of rows) {
      const mlScore = mlModel
        ? mlModelService.predictWithModel(mlModel, features)
        : 0.5;
      const advancedScores = advancedInference.scores[number] || null;
      const modelScore = modelScoreFromAdvanced({
        advancedScores,
        fallbackScore: mlScore
      });

      const score = Number(
        (
          activeWeights.southHotScore * features.southHotScore +
          activeWeights.centralRepeatScore * features.centralRepeatScore +
          activeWeights.northRecentScore * features.northRecentScore +
          activeWeights.cascadeScore * features.cascadeScore +
          activeWeights.gapCycleScore * features.gapCycleScore +
          activeWeights.markovScore * features.markovScore +
          activeWeights.recencyDecayScore * features.recencyDecayScore +
          activeWeights.rollingHot7Score * features.rollingHot7Score +
          activeWeights.rollingHot30Score * features.rollingHot30Score +
          activeWeights.rollingHot60Score * features.rollingHot60Score +
          activeWeights.dayOfWeekScore * features.dayOfWeekScore +
          activeWeights.pairFollowScore * features.pairFollowScore +
          activeWeights.specialRecentScore * features.specialRecentScore +
          activeWeights.patternTransitionScore *
            features.patternTransitionScore +
          activeWeights.mlScore * modelScore -
          activeWeights.sameDayHitPenalty * features.sameDayHitScore
        ).toFixed(4)
      );
      const calibratedProbability = calibrateProbability(
        score,
        predictionConfig?.calibration
      );

      const enrichedFeatures = {
        ...features,
        mlScore,
        modelScore,
        ...(advancedScores || {})
      };
      const currentBest = bestByNumber.get(number);

      if (!currentBest || score > currentBest.score) {
        bestByNumber.set(number, {
          number,
          score,
          calibratedProbability,
          confidenceLevel: confidenceLevel(score),
          likelyDate: targetDate,
          reason: `${buildReason(enrichedFeatures)}; mạnh nhất trong cửa sổ 7 ngày vào ${targetDate}`,
          features: enrichedFeatures
        });
      }
    }
  }

  const numbers = [...bestByNumber.values()]
    .sort((a, b) => b.score - a.score || a.number.localeCompare(b.number))
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }))
    .slice(0, topK);

  const prediction = await Prediction.findOneAndUpdate(
    {
      date: predictDate,
      code: target.code,
      targetType
    },
    {
      date: predictDate,
      area: target.area,
      province: target.province,
      code: target.code,
      region: target.code,
      targetType,
      topK,
      horizonDays,
      validUntil,
      numbers: numbers.map((item) => ({
        number: item.number,
        score: item.score,
        calibratedProbability: item.calibratedProbability,
        rank: item.rank,
        likelyDate: item.likelyDate,
        reason: item.reason
      })),
      scores: Object.fromEntries(numbers.map((item) => [item.number, item.score])),
      explanation: `Top ${topK} cặp số ưu tiên trong ${horizonDays} ngày, chỉ là xếp hạng xác suất tương đối theo thống kê, không đảm bảo trúng thưởng.`,
      modelVersion: modelDoc?.modelVersion || 'no_ml_model',
      generatedAt: new Date(),
      model: advancedInference.enabled
        ? `advanced:${advancedInference.modelVersion}`
        : modelDoc
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
      validUntil,
      horizonDates,
      target,
      targetType,
      recentDays,
      horizonDays,
      temporalOrder: [AREAS.SOUTH, AREAS.CENTRAL, AREAS.NORTH],
      weights: activeWeights,
      predictionConfig: predictionConfig
        ? {
            id: predictionConfig._id,
            objective: predictionConfig.objective,
            backtestRunId: predictionConfig.backtestRunId,
            metrics: predictionConfig.metrics,
            calibration: predictionConfig.calibration
          }
        : null,
      advancedInference: {
        enabled: advancedInference.enabled,
        source: advancedInference.source || null,
        modelVersion: advancedInference.modelVersion || null,
        gpu: advancedInference.gpu || false,
        reason: advancedInference.reason || null,
        modelWeights: advancedInferenceService.MODEL_WEIGHTS
      },
      mlModel: modelDoc
        ? {
            source: 'mongodb',
            version: modelDoc.modelVersion,
            trainedAt: modelDoc.trainedAt,
            metrics: modelDoc.metrics
          }
        : null,
      note: `Top ${topK} cặp số ưu tiên trong ${horizonDays} ngày, chỉ là xếp hạng xác suất tương đối theo thống kê, không đảm bảo trúng thưởng.`
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
  const targetType = normalizeTargetType(payload.targetType);
  const isDrawDate = await stationDrawsOnDate({
    code: target.code,
    date: today
  });

  if (!isDrawDate) return null;

  const exactPrediction = await Prediction.findOne({
    date: today,
    code: target.code,
    targetType
  }).lean();

  if (exactPrediction) return exactPrediction;

  return Prediction.findOne({
    code: target.code,
    targetType
  })
    .sort({ date: -1, generatedAt: -1 })
    .lean();
}

async function listAvailablePredictionStations(payload = {}) {
  const date = toDateString(payload.date);
  const targetType = normalizeTargetType(payload.targetType);
  const query = {
    date,
    targetType
  };

  if (payload.area) query.area = payload.area;

  const rows = await Prediction.find(query)
    .sort({ area: 1, province: 1, code: 1 })
    .select('area province code date targetType generatedAt')
    .lean();

  return rows.map((row) => ({
    area: row.area,
    province: row.province,
    code: row.code,
    displayName: row.province,
    date: row.date,
    targetType: row.targetType,
    generatedAt: row.generatedAt
  }));
}

module.exports = {
  generatePrediction,
  generateTemporalPrediction,
  getTodayPrediction,
  listAvailablePredictionStations,
  buildCandidateFeatureRows,
  resolvePredictionStation,
  addDays,
  toDateString,
  stationDrawsOnDate,
  allTwoDigitNumbers
};
