require('dotenv').config();

const mongoose = require('mongoose');
const { preGenerateTodayPredictions } = require('../src/services/prediction.service');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in .env');
  }

  const date = process.argv[2];
  const topK = Number(process.argv[3] || 5);
  const recentDays = Number(process.argv[4] || 14);
  const area = process.argv[5];

  await mongoose.connect(MONGO_URI);

  const result = await preGenerateTodayPredictions({
    date,
    topK,
    recentDays,
    area
  });

  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
