const Result = require('../models/Result');
const numberExtractor = require('./numberExtractor.service');

const PRIZE_KEYS = ['db', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
const AREA_TO_REGION = {
  mien_bac: 'mien-bac',
  mien_trung: 'mien-trung',
  mien_nam: 'mien-nam'
};
const REGION_TO_AREA = {
  'mien-bac': 'mien_bac',
  'mien-trung': 'mien_trung',
  'mien-nam': 'mien_nam'
};

function toDateString(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toDrawDate(date) {
  return new Date(`${toDateString(date)}T00:00:00.000Z`);
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizePrizeKey(key) {
  const value = String(key || '').trim().toLowerCase();
  if (['special', 'gdb', 'db'].includes(value)) return 'db';
  return value;
}

function normalizeResults(results = {}) {
  const normalized = {};

  for (const key of PRIZE_KEYS) {
    normalized[key] = [];
  }

  for (const [key, rawValue] of Object.entries(results || {})) {
    const prizeKey = normalizePrizeKey(key);
    if (!PRIZE_KEYS.includes(prizeKey)) continue;

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    normalized[prizeKey] = values.map(onlyDigits).filter(Boolean);
  }

  return normalized;
}

function normalizeArea(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (REGION_TO_AREA[raw]) return REGION_TO_AREA[raw];
  return raw.replace(/-/g, '_');
}

function normalizeRegion(value, area) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw) return raw.replace(/_/g, '-');
  return AREA_TO_REGION[area] || '';
}

function extractTailNumbers(results, size) {
  const values = [];
  const seen = new Set();

  for (const prizeKey of PRIZE_KEYS) {
    for (const rawNumber of results[prizeKey] || []) {
      const number = onlyDigits(rawNumber);
      if (number.length < size) continue;

      const tail = number.slice(-size);
      if (seen.has(tail)) continue;

      seen.add(tail);
      values.push(tail);
    }
  }

  return values;
}

function normalizeResultPayload(payload = {}) {
  const date = toDateString(payload.date || payload.drawDate);
  const prizes = normalizeResults(payload.prizes || payload.results);
  const area = normalizeArea(payload.area || payload.region);
  const region = normalizeRegion(payload.region, area);
  const code = String(payload.code || payload.stationCode || payload.province || '').trim().toUpperCase();
  const province = String(payload.province || payload.stationName || code).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid result date: ${date}`);
  }

  if (!area || !province || !code) {
    throw new Error('area, province, and code are required');
  }

  if (!prizes.db.length) {
    throw new Error(`Missing special prize (db) for ${province} ${date}`);
  }

  return {
    date,
    drawDate: toDrawDate(date),
    area,
    code,
    prizes,
    special: prizes.db[0],
    weekday: payload.weekday || '',
    region,
    province,
    stationName: payload.stationName || province,
    stationCode: code,
    results: prizes,
    allNumbers2D: extractTailNumbers(prizes, 2),
    allNumbers3D: extractTailNumbers(prizes, 3),
    source: payload.source || 'unknown',
    sourceUrl: payload.sourceUrl || ''
  };
}

function buildResultQuery({ area, province, code, region, date } = {}) {
  const query = {};
  const normalizedArea = normalizeArea(area || region);
  const normalizedCode = String(code || region || '').trim().toUpperCase();

  if (date) query.date = toDateString(date);
  if (normalizedCode && normalizedCode !== normalizedArea.toUpperCase()) query.code = normalizedCode;
  if (normalizedArea) query.area = normalizedArea;
  if (province) query.province = String(province).trim();

  return query;
}

function normalizeLimit(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 500);
}

async function importResult(payload) {
  const doc = normalizeResultPayload(payload);

  const saved = await Result.findOneAndUpdate(
    { date: doc.date, code: doc.code },
    { $set: doc },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  ).lean();

  await numberExtractor.rebuildNumbersForResult(saved);
  return saved;
}

async function upsertLotteryResult(payload) {
  return importResult(payload);
}

async function getLatestResult(options = {}) {
  return Result.findOne(buildResultQuery(options))
    .sort({ drawDate: -1, date: -1 })
    .lean();
}

async function getResultByDate(options = {}) {
  return Result.findOne(buildResultQuery(options)).lean();
}

async function getHistory(options = {}) {
  const { limit, ...queryOptions } = options;
  return Result.find(buildResultQuery(queryOptions))
    .sort({ drawDate: -1, date: -1 })
    .limit(normalizeLimit(limit))
    .lean();
}

async function getAvailableDates(options = {}) {
  const { limit, ...queryOptions } = options;
  const rows = await Result.find(buildResultQuery(queryOptions))
    .sort({ drawDate: -1, date: -1 })
    .limit(normalizeLimit(limit, 100))
    .select('date drawDate code area province')
    .lean();

  return rows.map((row) => ({
    date: row.date,
    drawDate: row.drawDate,
    area: row.area,
    province: row.province,
    code: row.code
  }));
}

module.exports = {
  PRIZE_KEYS,
  normalizeResults,
  normalizeResultPayload,
  importResult,
  upsertLotteryResult,
  getLatestResult,
  getResultByDate,
  getHistory,
  getAvailableDates
};
