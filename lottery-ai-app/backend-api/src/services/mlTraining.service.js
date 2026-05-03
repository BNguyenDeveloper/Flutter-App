const LotteryNumber = require('../models/LotteryNumber');
const Result = require('../models/Result');
const predictionService = require('./prediction.service');
const mlModelService = require('./mlModel.service');

async function availableDates(limitDays = 120) {
  const rows = await Result.aggregate([
    { $group: { _id: '$date' } },
    { $sort: { _id: -1 } },
    { $limit: Math.max(Number(limitDays) + 14, 30) }
  ]);

  return rows.map((row) => row._id).sort();
}

async function targetNumberSet({ code, area, date }) {
  const query = { date, last2: { $ne: null } };

  if (code) query.code = String(code).toUpperCase();
  else if (area) query.area = area;

  const rows = await LotteryNumber.find(query).select('last2').lean();
  return new Set(rows.map((row) => row.last2));
}

async function buildTrainingRows(options = {}) {
  const target = await predictionService.resolvePredictionStation(options);

  const recentDays = Math.min(Math.max(Number(options.recentDays || 14), 3), 365);
  const trainDays = Math.min(Math.max(Number(options.trainDays || 120), 10), 2000);

  const dates = await availableDates(trainDays);
  const rows = [];

  for (const signalDate of dates) {
    const predictDate = predictionService.addDays(signalDate, 1);

    const targetSet = await targetNumberSet({
      code: target.code,
      area: target.area,
      date: predictDate
    });

    if (!targetSet.size) continue;

    const candidateRows = await predictionService.buildCandidateFeatureRows({
      signalDate,
      target,
      recentDays
    });

    for (const row of candidateRows) {
      rows.push({
        signalDate,
        predictDate,
        code: target.code,
        number: row.number,
        target: targetSet.has(row.number) ? 1 : 0,
        features: row.features
      });
    }
  }

  return {
    rows,
    target,
    recentDays,
    trainDays
  };
}

async function trainAndSaveModel(options = {}) {
  const { rows, target, recentDays, trainDays } = await buildTrainingRows(options);

  const model = mlModelService.trainLogisticRegression(rows, {
    epochs: options.epochs || 600,
    learningRate: options.learningRate || 0.08,
    l2: options.l2 || 0.001
  });

  model.target = target;
  model.recentDays = recentDays;
  model.trainDays = trainDays;
  model.algorithm = 'logistic_regression_gradient_descent';
  model.temporalOrder = ['mien_nam', 'mien_trung', 'mien_bac'];
  model.note =
    'ML score học từ feature rule Nam -> Trung -> Bắc. Đây là xác suất tương đối, không đảm bảo trúng thưởng.';

  const savedModel = await mlModelService.saveModel(target.code, model, {
    historyDays: trainDays,
    recentDays,
    metrics: model.metrics || {},
    modelVersion: options.modelVersion
  });

  return {
    model,
    savedModel: {
      id: savedModel._id,
      code: savedModel.code,
      modelVersion: savedModel.modelVersion,
      trainedAt: savedModel.trainedAt,
      source: 'mongodb:ml_models'
    }
  };
}

module.exports = {
  buildTrainingRows,
  trainAndSaveModel
};