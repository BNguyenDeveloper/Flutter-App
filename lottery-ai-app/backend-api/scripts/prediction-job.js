const dotenv = require('dotenv');
const mongoose = require('mongoose');

const Province = require('../src/models/Province');
const Prediction = require('../src/models/Prediction');
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

async function latestSignalDateBefore(targetDate, station = {}) {
  const row = await Result.findOne({
    date: { $lt: targetDate },
    code: station.code
  })
    .sort({ drawDate: -1, date: -1 })
    .select('date')
    .lean();

  return row?.date || null;
}

async function main() {
  const [, , rawDate, rawTopK, rawRecentDays, rawArea, rawTargetType] = process.argv;
  const targetDate = toDateString(rawDate);
  const topK = normalizeTopK(rawTopK);
  const recentDays = normalizeRecentDays(rawRecentDays);
  const area = rawArea ? String(rawArea).trim() : '';
  const targetType = rawTargetType === 'special' ? 'special' : 'loto';

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_ai_app';
  await mongoose.connect(uri);

  const query = { active: true };
  if (area) query.area = area;

  const stations = await Province.find(query).sort({ area: 1, province: 1 }).lean();

  if (!stations.length) {
    console.log('[Prediction Job] No active stations found in provinces.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(
    `[Prediction Job] Start targetDate=${targetDate}, topK=${topK}, recentDays=${recentDays}, targetType=${targetType}, stations=${stations.length}`
  );

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const station of stations) {
    try {
      const isDrawDate = await predictionService.stationDrawsOnDate({
        code: station.code,
        date: targetDate
      });

      if (!isDrawDate) {
        skipped += 1;
        await Prediction.deleteMany({
          date: targetDate,
          code: station.code,
          targetType
        });
        console.log(
          `[Prediction Job] SKIP ${station.code} - ${station.province}: no draw on ${targetDate}`
        );
        continue;
      }

      const signalDate = await latestSignalDateBefore(targetDate, station);
      if (!signalDate) {
        failed += 1;
        console.error(
          `[Prediction Job] FAIL ${station.code} - ${station.province}: no result before ${targetDate}`
        );
        continue;
      }

      const result = await predictionService.generatePrediction({
        area: station.area,
        province: station.province,
        code: station.code,
        topK,
        recentDays,
        signalDate,
        predictDate: targetDate,
        targetType
      });

      const count = result?.prediction?.numbers?.length || 0;
      success += 1;
      console.log(
        `[Prediction Job] OK ${station.code} - ${station.province}: signalDate=${signalDate}, ${count} numbers`
      );
    } catch (error) {
      failed += 1;
      console.error(`[Prediction Job] FAIL ${station.code} - ${station.province}: ${error.message}`);
    }
  }

  console.log(`[Prediction Job] Done. success=${success}, skipped=${skipped}, failed=${failed}`);
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
