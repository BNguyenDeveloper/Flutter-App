const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Result = require('../src/models/Result');
const Prediction = require('../src/models/Prediction');

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_ai_app';
  await mongoose.connect(uri);
  await Result.deleteMany({});
  await Prediction.deleteMany({});
  console.log('Cleared results and predictions');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
