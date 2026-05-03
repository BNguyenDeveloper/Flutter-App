const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Result = require('../src/models/Result');
const Province = require('../src/models/Province');
const { rebuildNumbersForResult } = require('../src/services/numberExtractor.service');

dotenv.config();

function numberString(length) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1))).padStart(length, '0');
}

function dateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildNorthPrizes() {
  return {
    db: [numberString(5)],
    g1: [numberString(5)],
    g2: [numberString(5), numberString(5)],
    g3: Array.from({ length: 6 }, () => numberString(5)),
    g4: Array.from({ length: 4 }, () => numberString(4)),
    g5: Array.from({ length: 6 }, () => numberString(4)),
    g6: Array.from({ length: 3 }, () => numberString(3)),
    g7: Array.from({ length: 4 }, () => numberString(2))
  };
}

function buildSouthCentralPrizes() {
  return {
    g8: [numberString(2)],
    g7: [numberString(3)],
    g6: Array.from({ length: 3 }, () => numberString(4)),
    g5: [numberString(4)],
    g4: Array.from({ length: 7 }, () => numberString(5)),
    g3: Array.from({ length: 2 }, () => numberString(5)),
    g2: [numberString(5)],
    g1: [numberString(5)],
    db: [numberString(6)]
  };
}

function extractTwoDigits(prizes) {
  return Object.values(prizes).flat().map((n) => String(n).slice(-2));
}

async function ensureDefaultProvince() {
  return Province.findOneAndUpdate(
    { code: 'XSMB' },
    { area: 'mien_bac', province: 'Miền Bắc', code: 'XSMB', displayName: 'Xổ số Miền Bắc', active: true },
    { upsert: true, new: true, runValidators: true }
  );
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_ai_app';
  await mongoose.connect(uri);

  const station = await ensureDefaultProvince();
  const docs = [];

  for (let i = 90; i >= 1; i--) {
    const date = dateString(i);
    const prizes = buildNorthPrizes();
    docs.push({
      date,
      drawDate: new Date(`${date}T00:00:00.000Z`),
      area: station.area,
      province: station.province,
      code: station.code,
      region: station.code,
      weekday: '',
      prizes,
      special: prizes.db[0],
      twoDigits: extractTwoDigits(prizes)
    });
  }

  for (const doc of docs) {
    const saved = await Result.findOneAndUpdate(
      { date: doc.date, code: doc.code },
      doc,
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await rebuildNumbersForResult(saved);
  }

  console.log(`Seeded ${docs.length} ${station.code} results and extracted lottery_numbers`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
