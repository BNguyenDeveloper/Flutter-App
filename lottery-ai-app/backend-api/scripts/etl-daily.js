require('dotenv').config();

const mongoose = require('mongoose');
const Result = require('../src/models/Result');
const { rebuildNumbersForResult } = require('../src/services/numberExtractor.service');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  if (!MONGO_URI) throw new Error('Missing MONGO_URI or MONGODB_URI in .env');

  await mongoose.connect(MONGO_URI);

  const targetDate = process.argv[2] || new Date().toISOString().slice(0, 10);
  const rows = await Result.find({ date: targetDate }).lean();

  if (!rows.length) {
    console.log(`[ETL] No draw results found for ${targetDate}. Nothing to update.`);
    await mongoose.disconnect();
    return;
  }

  for (const row of rows) {
    await rebuildNumbersForResult(row);
  }

  console.log(`[ETL] Updated lottery numbers for ${rows.length} results on ${targetDate}.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[ETL] Fatal error:', error);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
