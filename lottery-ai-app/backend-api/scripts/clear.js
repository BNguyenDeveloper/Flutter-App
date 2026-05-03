require('dotenv').config();

const mongoose = require('mongoose');

const Result = require('../src/models/Result');
const Prediction = require('../src/models/Prediction');
const Province = require('../src/models/Province');
const LotteryNumber = require('../src/models/LotteryNumber');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI or MONGODB_URI in .env');
  }

  await mongoose.connect(MONGO_URI);

  await Promise.all([
    Result.deleteMany({}),
    Prediction.deleteMany({}),
    Province.deleteMany({}),
    LotteryNumber.deleteMany({})
  ]);

  console.log('Cleared Result, Prediction, Province, LotteryNumber');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});