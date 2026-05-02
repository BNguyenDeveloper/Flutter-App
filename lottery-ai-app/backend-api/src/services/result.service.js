const Result = require('../models/Result');

async function getLatestResult(region) {
  const query = region ? { region: region.toUpperCase() } : {};
  return Result.findOne(query).sort({ date: -1 }).lean();
}

async function getHistory({ region, limit = 30 }) {
  const query = region ? { region: region.toUpperCase() } : {};
  const safeLimit = Math.min(Number(limit) || 30, 365);
  return Result.find(query).sort({ date: -1 }).limit(safeLimit).lean();
}

async function importResult(payload) {
  const { date, region, prizes, twoDigits } = payload;

  if (!date || !region || !prizes || !Array.isArray(twoDigits)) {
    const error = new Error('date, region, prizes, and twoDigits are required');
    error.status = 400;
    throw error;
  }

  return Result.findOneAndUpdate(
    { date, region: region.toUpperCase() },
    { date, region: region.toUpperCase(), prizes, twoDigits },
    { new: true, upsert: true, runValidators: true }
  ).lean();
}

module.exports = { getLatestResult, getHistory, importResult };
