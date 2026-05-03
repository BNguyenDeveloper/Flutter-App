const Result = require('../models/Result');
const provinceService = require('./province.service');
const {
  normalizePrizes,
  rebuildNumbersForResult
} = require('./numberExtractor.service');

function toDateString(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toDrawDate(date) {
  const dateString = toDateString(date);
  return new Date(`${dateString}T00:00:00.000Z`);
}

async function resolveStation(payload = {}) {
  const code = String(payload.code || payload.region || 'XSMB').toUpperCase();
  const station = await provinceService.getProvinceByCode(code);

  return {
    area: payload.area || station?.area || (code === 'MB' || code === 'XSMB' ? 'mien_bac' : 'mien_nam'),
    province: payload.province || station?.province || (code === 'MB' || code === 'XSMB' ? 'Miền Bắc' : code),
    code
  };
}

function buildQuery({ area, province, code, region } = {}) {
  const query = {};

  if (code) query.code = String(code).toUpperCase();
  else if (region) query.code = String(region).toUpperCase();

  if (area) query.area = area;
  if (province) query.province = province;

  return query;
}

async function getLatestResult(filters = {}) {
  if (typeof filters === 'string') filters = { code: filters };

  const query = buildQuery(filters);

  return Result.findOne(query)
    .sort({ drawDate: -1, date: -1 })
    .select('-__v -createdAt -updatedAt')
    .lean();
}

async function getHistory({ area, province, code, region, limit = 30 } = {}) {
  const query = buildQuery({ area, province, code, region });
  const safeLimit = Math.min(Number(limit) || 30, 3650);

  return Result.find(query)
    .sort({ drawDate: -1, date: -1 })
    .limit(safeLimit)
    .select('-__v -createdAt -updatedAt')
    .lean();
}

async function importResult(payload) {
  const { prizes } = payload;
  const date = toDateString(payload.date || payload.drawDate);

  if (!date || !prizes) {
    const error = new Error('date/drawDate and prizes are required');
    error.status = 400;
    throw error;
  }

  const station = await resolveStation(payload);
  const normalizedPrizes = normalizePrizes(prizes);
  const special = normalizedPrizes.db?.[0] || payload.special || '';

  const saved = await Result.findOneAndUpdate(
    { date, code: station.code },
    {
      date,
      drawDate: toDrawDate(date),
      ...station,
      weekday: payload.weekday || '',
      prizes: normalizedPrizes,
      special
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  await rebuildNumbersForResult(saved);

  return saved.toObject();
}

module.exports = {
  getLatestResult,
  getHistory,
  importResult,
  resolveStation
};