require('dotenv').config();

const mongoose = require('mongoose');
const { trainAndSaveModel } = require('../src/services/mlTraining.service');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI or MONGODB_URI in .env');
  }

  const code = process.argv[2] || 'XSMB';
  const historyDays = Number(process.argv[3] || 365);
  const recentDays = Number(process.argv[4] || 14);

  await mongoose.connect(MONGO_URI);

  console.log(`Training model for ${code}...`);

  const result = await trainAndSaveModel({
    code,
    trainDays: historyDays,
    recentDays
  });

  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});