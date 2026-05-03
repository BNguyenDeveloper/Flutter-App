const MLModel = require('../models/MLModel');

const FEATURE_KEYS = [
  'southHotScore',
  'centralRepeatScore',
  'northRecentScore',
  'cascadeScore',
  'gapCycleScore',
  'markovScore',
  'headAbsentScore',
  'tailAbsentScore',
  'patternTransitionScore'
];

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function getFeatureVector(features = {}) {
  return FEATURE_KEYS.map((key) => Number(features[key] || 0));
}

function predictRaw(model, features = {}) {
  const x = getFeatureVector(features);
  const weights = model.weights || {};
  let z = Number(model.bias || 0);

  FEATURE_KEYS.forEach((key, index) => {
    z += Number(weights[key] || 0) * x[index];
  });

  return sigmoid(z);
}

function predictWithModel(model, features = {}) {
  if (!model) return 0.5;
  return Number(predictRaw(model, features).toFixed(4));
}

function trainLogisticRegression(rows = [], options = {}) {
  const epochs = Number(options.epochs || 600);
  const learningRate = Number(options.learningRate || 0.08);
  const l2 = Number(options.l2 || 0.001);

  const weights = Object.fromEntries(FEATURE_KEYS.map((key) => [key, 0]));
  let bias = 0;

  if (!rows.length) {
    return {
      version: new Date().toISOString(),
      algorithm: 'logistic_regression_gradient_descent',
      featureKeys: FEATURE_KEYS,
      weights,
      bias,
      metrics: {
        totalSamples: 0,
        positiveSamples: 0,
        negativeSamples: 0,
        accuracy: 0,
        precision: 0,
        recall: 0
      }
    };
  }

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    let biasGradient = 0;
    const weightGradients = Object.fromEntries(FEATURE_KEYS.map((key) => [key, 0]));

    for (const row of rows) {
      const y = Number(row.target || 0);
      const prediction = predictRaw({ weights, bias }, row.features);
      const error = prediction - y;

      biasGradient += error;

      FEATURE_KEYS.forEach((key) => {
        weightGradients[key] += error * Number(row.features?.[key] || 0);
      });
    }

    bias -= learningRate * (biasGradient / rows.length);

    FEATURE_KEYS.forEach((key) => {
      const regularization = l2 * weights[key];
      weights[key] -= learningRate * ((weightGradients[key] / rows.length) + regularization);
    });
  }

  const metrics = evaluateModel({ weights, bias }, rows);

  return {
    version: new Date().toISOString(),
    algorithm: 'logistic_regression_gradient_descent',
    featureKeys: FEATURE_KEYS,
    weights,
    bias,
    metrics
  };
}

function evaluateModel(model, rows = []) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const row of rows) {
    const y = Number(row.target || 0);
    const p = predictWithModel(model, row.features);
    const predicted = p >= 0.5 ? 1 : 0;

    if (predicted === 1 && y === 1) tp += 1;
    else if (predicted === 0 && y === 0) tn += 1;
    else if (predicted === 1 && y === 0) fp += 1;
    else if (predicted === 0 && y === 1) fn += 1;
  }

  const total = rows.length || 1;

  return {
    totalSamples: rows.length,
    positiveSamples: rows.filter((r) => Number(r.target || 0) === 1).length,
    negativeSamples: rows.filter((r) => Number(r.target || 0) === 0).length,
    accuracy: Number(((tp + tn) / total).toFixed(4)),
    precision: Number((tp / Math.max(tp + fp, 1)).toFixed(4)),
    recall: Number((tp / Math.max(tp + fn, 1)).toFixed(4)),
    tp,
    tn,
    fp,
    fn
  };
}

function buildModelVersion() {
  return new Date().toISOString();
}

async function saveModel(code, modelData, meta = {}) {
  const normalizedCode = String(code).toUpperCase().trim();
  const modelVersion = meta.modelVersion || buildModelVersion();

  return MLModel.findOneAndUpdate(
    {
      code: normalizedCode,
      modelVersion
    },
    {
      code: normalizedCode,
      modelVersion,
      trainedAt: new Date(),
      historyDays: meta.historyDays || 365,
      recentDays: meta.recentDays || 14,
      metrics: meta.metrics || modelData.metrics || {},
      model: modelData,
      active: true
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

async function loadModel(code) {
  const normalizedCode = String(code).toUpperCase().trim();

  const doc = await MLModel.findOne({
    code: normalizedCode,
    active: true
  })
    .sort({ trainedAt: -1 })
    .lean();

  if (!doc) return null;

  return {
    code: doc.code,
    modelVersion: doc.modelVersion,
    trainedAt: doc.trainedAt,
    historyDays: doc.historyDays,
    recentDays: doc.recentDays,
    metrics: doc.metrics,
    model: doc.model
  };
}

module.exports = {
  FEATURE_KEYS,
  trainLogisticRegression,
  evaluateModel,
  predictWithModel,
  saveModel,
  loadModel
};