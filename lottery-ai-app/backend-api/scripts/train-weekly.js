require('dotenv').config();

const mongoose = require('mongoose');
const Province = require('../src/models/Province');
const { trainAndSaveModel } = require('../src/services/mlTraining.service');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  if (!MONGO_URI) throw new Error('Missing MONGO_URI or MONGODB_URI in .env');
  await mongoose.connect(MONGO_URI);

  const historyDays = Number(process.argv[2] || 365);
  const recentDays = Number(process.argv[3] || 14);

  const stations = await Province.find({ active: true }).sort({ area: 1, province: 1 }).lean();
  let success = 0;
  let failed = 0;

  for (const station of stations) {
    try {
      await trainAndSaveModel({ code: station.code, trainDays: historyDays, recentDays });
      success += 1;
      console.log(`[Train Weekly] OK ${station.code}`);
    } catch (error) {
      failed += 1;
      console.error(`[Train Weekly] FAIL ${station.code}: ${error.message}`);
    }
  }

  console.log(`[Train Weekly] Done. success=${success}, failed=${failed}`);
  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error('[Train Weekly] Fatal error:', error);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
