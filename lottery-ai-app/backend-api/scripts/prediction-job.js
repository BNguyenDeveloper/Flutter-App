const dotenv = require('dotenv');
const mongoose = require('mongoose');

const Province = require('../src/models/Province');
const Result = require('../src/models/Result');
const predictionService = require('../src/services/prediction.service');

dotenv.config();

function toDateString(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeTopK(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), 100);
}

function normalizeRecentDays(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 14;
  return Math.min(Math.max(parsed, 3), 3650);
}

async function latestSignalDateBefore(targetDate) {
  const row = await Result.findOne({ date: { $lt: targetDate } })
    .sort({ drawDate: -1, date: -1 })
    .select('date')
    .lean();

  return row?.date || null;
}

async function main() {
  const [, , rawDate, rawTopK, rawRecentDays, rawArea] = process.argv;
  const targetDate = toDateString(rawDate);
  const topK = normalizeTopK(rawTopK);
  const recentDays = normalizeRecentDays(rawRecentDays);
  const area = rawArea ? String(rawArea).trim() : '';

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_ai_app';
  await mongoose.connect(uri);

  const query = { active: true };
  if (area) query.area = area;

  const stations = await Province.find(query).sort({ area: 1, province: 1 }).lean();

  if (!stations.length) {
    console.log('[Prediction Job] Không có đài nào trong collection provinces. Hãy chạy: npm run seed:provinces');
    await mongoose.disconnect();
    process.exit(0);
  }

  const signalDate = await latestSignalDateBefore(targetDate);
  if (!signalDate) {
    console.log(`[Prediction Job] Chưa có dữ liệu kết quả trước ngày ${targetDate}. Hãy seed/import kết quả trước.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`[Prediction Job] Start targetDate=${targetDate}, signalDate=${signalDate}, topK=${topK}, recentDays=${recentDays}, stations=${stations.length}`);

  let success = 0;
  let failed = 0;

  for (const station of stations) {
    try {
      const result = await predictionService.generatePrediction({
        area: station.area,
        province: station.province,
        code: station.code,
        topK,
        recentDays,
        signalDate,
        predictDate: targetDate
      });

      const count = result?.prediction?.numbers?.length || 0;
      success += 1;
      console.log(`[Prediction Job] OK ${station.code} - ${station.province}: ${count} số`);
    } catch (error) {
      failed += 1;
      console.error(`[Prediction Job] FAIL ${station.code} - ${station.province}: ${error.message}`);
    }
  }

  console.log(`[Prediction Job] Done. success=${success}, failed=${failed}`);
  await mongoose.disconnect();

  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error('[Prediction Job] Fatal error:', error);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
