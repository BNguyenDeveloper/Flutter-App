const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Result = require('../src/models/Result');

dotenv.config();

function randomTwoDigits(count = 27) {
  const values = new Set();
  while (values.size < count) {
    values.add(String(Math.floor(Math.random() * 100)).padStart(2, '0'));
  }
  return Array.from(values);
}

function dateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_ai_app';
  await mongoose.connect(uri);

  const docs = [];
  for (let i = 90; i >= 1; i--) {
    docs.push({
      date: dateString(i),
      region: 'MB',
      prizes: {
        special: String(Math.floor(10000 + Math.random() * 90000)),
        first: [String(Math.floor(10000 + Math.random() * 90000))],
        second: [
          String(Math.floor(10000 + Math.random() * 90000)),
          String(Math.floor(10000 + Math.random() * 90000))
        ]
      },
      twoDigits: randomTwoDigits(27)
    });
  }

  for (const doc of docs) {
    await Result.findOneAndUpdate(
      { date: doc.date, region: doc.region },
      doc,
      { upsert: true, runValidators: true }
    );
  }

  console.log(`Seeded ${docs.length} MB results`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
