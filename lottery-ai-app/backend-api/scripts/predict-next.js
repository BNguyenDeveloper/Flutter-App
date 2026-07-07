require('dotenv').config();

const mongoose = require('mongoose');
const { generateTemporalPrediction } = require('../src/services/prediction.service');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  if (!MONGO_URI) throw new Error('Missing MONGO_URI or MONGODB_URI in .env');

  await mongoose.connect(MONGO_URI);

  const signalDate = process.argv[2];
  const code = process.argv[3] || 'XSMB';
  const topK = Number(process.argv[4] || 5);

  const result = await generateTemporalPrediction({ signalDate, code, topK, recentDays: 14 });
  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
