const axios = require('axios');
const Result = require('../models/Result');
const Prediction = require('../models/Prediction');

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function getTodayPrediction(region = 'MB') {
  return Prediction.findOne({ date: todayString(), region: region.toUpperCase() }).lean();
}

async function savePrediction({ date = todayString(), region = 'MB', numbers = [], model = 'manual_or_pending' }) {
  return Prediction.findOneAndUpdate(
    { date, region: region.toUpperCase() },
    { date, region: region.toUpperCase(), numbers, model },
    { new: true, upsert: true, runValidators: true }
  ).lean();
}

async function generatePrediction({ region = 'MB', topK = 10 }) {
  const safeRegion = region.toUpperCase();
  const history = await Result.find({ region: safeRegion }).sort({ date: -1 }).limit(120).lean();

  if (!history.length) {
    const error = new Error('No result history found. Please run npm run seed or import results first.');
    error.status = 400;
    throw error;
  }

  const engineUrl = process.env.PREDICTION_ENGINE_URL || 'http://localhost:8000';

  try {
    const response = await axios.post(
      `${engineUrl}/predict`,
      {
        region: safeRegion,
        history: history.reverse().map((item) => ({ date: item.date, twoDigits: item.twoDigits })),
        topK: Number(topK) || 10
      },
      { timeout: 10000 }
    );

    return savePrediction({
      date: todayString(),
      region: safeRegion,
      numbers: response.data.numbers || [],
      model: response.data.model || 'frequency_gap_markov_ensemble'
    });
  } catch (error) {
    const wrapped = new Error(`Prediction engine unavailable or failed: ${error.message}`);
    wrapped.status = 503;
    throw wrapped;
  }
}

module.exports = { getTodayPrediction, savePrediction, generatePrediction };
