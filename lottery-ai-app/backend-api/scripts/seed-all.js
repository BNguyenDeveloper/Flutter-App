require('dotenv').config();

const mongoose = require('mongoose');

const Province = require('../src/models/Province');
const Result = require('../src/models/Result');
const LotteryNumber = require('../src/models/LotteryNumber');
const { rebuildNumbersForResult } = require('../src/services/numberExtractor.service');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const provinces = [
  // Bắc
  { area: 'mien_bac', province: 'Miền Bắc', code: 'XSMB', displayName: 'Xổ số Miền Bắc' },

  // Trung
  { area: 'mien_trung', province: 'Bình Định', code: 'XSBDI', displayName: 'Xổ số Bình Định' },
  { area: 'mien_trung', province: 'Đắk Lắk', code: 'XSDLK', displayName: 'Xổ số Đắk Lắk' },
  { area: 'mien_trung', province: 'Đà Nẵng', code: 'XSDNG', displayName: 'Xổ số Đà Nẵng' },
  { area: 'mien_trung', province: 'Đắk Nông', code: 'XSDNO', displayName: 'Xổ số Đắk Nông' },
  { area: 'mien_trung', province: 'Gia Lai', code: 'XSGL', displayName: 'Xổ số Gia Lai' },
  { area: 'mien_trung', province: 'Khánh Hòa', code: 'XSKH', displayName: 'Xổ số Khánh Hòa' },
  { area: 'mien_trung', province: 'Kon Tum', code: 'XSKT', displayName: 'Xổ số Kon Tum' },
  { area: 'mien_trung', province: 'Ninh Thuận', code: 'XSNT', displayName: 'Xổ số Ninh Thuận' },
  { area: 'mien_trung', province: 'Phú Yên', code: 'XSPY', displayName: 'Xổ số Phú Yên' },
  { area: 'mien_trung', province: 'Quảng Bình', code: 'XSQB', displayName: 'Xổ số Quảng Bình' },
  { area: 'mien_trung', province: 'Quảng Ngãi', code: 'XSQNG', displayName: 'Xổ số Quảng Ngãi' },
  { area: 'mien_trung', province: 'Quảng Nam', code: 'XSQNM', displayName: 'Xổ số Quảng Nam' },
  { area: 'mien_trung', province: 'Quảng Trị', code: 'XSQT', displayName: 'Xổ số Quảng Trị' },
  { area: 'mien_trung', province: 'Thừa Thiên Huế', code: 'XSTTH', displayName: 'Xổ số Thừa Thiên Huế' },

  // Nam
  { area: 'mien_nam', province: 'TPHCM', code: 'XSHCM', displayName: 'Xổ số TPHCM' },
  { area: 'mien_nam', province: 'An Giang', code: 'XSAG', displayName: 'Xổ số An Giang' },
  { area: 'mien_nam', province: 'Bình Dương', code: 'XSBDU', displayName: 'Xổ số Bình Dương' },
  { area: 'mien_nam', province: 'Bạc Liêu', code: 'XSBL', displayName: 'Xổ số Bạc Liêu' },
  { area: 'mien_nam', province: 'Bình Phước', code: 'XSBP', displayName: 'Xổ số Bình Phước' },
  { area: 'mien_nam', province: 'Bến Tre', code: 'XSBT', displayName: 'Xổ số Bến Tre' },
  { area: 'mien_nam', province: 'Bình Thuận', code: 'XSBTH', displayName: 'Xổ số Bình Thuận' },
  { area: 'mien_nam', province: 'Cà Mau', code: 'XSCM', displayName: 'Xổ số Cà Mau' },
  { area: 'mien_nam', province: 'Cần Thơ', code: 'XSCT', displayName: 'Xổ số Cần Thơ' },
  { area: 'mien_nam', province: 'Đà Lạt', code: 'XSDLT', displayName: 'Xổ số Đà Lạt' },
  { area: 'mien_nam', province: 'Đồng Nai', code: 'XSDNA', displayName: 'Xổ số Đồng Nai' },
  { area: 'mien_nam', province: 'Đồng Tháp', code: 'XSDT', displayName: 'Xổ số Đồng Tháp' },
  { area: 'mien_nam', province: 'Hậu Giang', code: 'XSHG', displayName: 'Xổ số Hậu Giang' },
  { area: 'mien_nam', province: 'Kiên Giang', code: 'XSKG', displayName: 'Xổ số Kiên Giang' },
  { area: 'mien_nam', province: 'Long An', code: 'XSLA', displayName: 'Xổ số Long An' },
  { area: 'mien_nam', province: 'Sóc Trăng', code: 'XSST', displayName: 'Xổ số Sóc Trăng' },
  { area: 'mien_nam', province: 'Tiền Giang', code: 'XSTG', displayName: 'Xổ số Tiền Giang' },
  { area: 'mien_nam', province: 'Tây Ninh', code: 'XSTN', displayName: 'Xổ số Tây Ninh' },
  { area: 'mien_nam', province: 'Trà Vinh', code: 'XSTV', displayName: 'Xổ số Trà Vinh' },
  { area: 'mien_nam', province: 'Vĩnh Long', code: 'XSVL', displayName: 'Xổ số Vĩnh Long' },
  { area: 'mien_nam', province: 'Vũng Tàu', code: 'XSVT', displayName: 'Xổ số Vũng Tàu' }
];

function padNumber(value, length) {
  return String(value).padStart(length, '0');
}

function randomNumber(length) {
  const max = 10 ** length;
  return padNumber(Math.floor(Math.random() * max), length);
}

function buildNorthPrizes() {
  return {
    db: [randomNumber(5)],
    g1: [randomNumber(5)],
    g2: [randomNumber(5), randomNumber(5)],
    g3: Array.from({ length: 6 }, () => randomNumber(5)),
    g4: Array.from({ length: 4 }, () => randomNumber(4)),
    g5: Array.from({ length: 6 }, () => randomNumber(4)),
    g6: Array.from({ length: 3 }, () => randomNumber(3)),
    g7: Array.from({ length: 4 }, () => randomNumber(2))
  };
}

function buildSouthCentralPrizes() {
  return {
    g8: [randomNumber(2)],
    g7: [randomNumber(3)],
    g6: Array.from({ length: 3 }, () => randomNumber(4)),
    g5: [randomNumber(4)],
    g4: Array.from({ length: 7 }, () => randomNumber(5)),
    g3: Array.from({ length: 2 }, () => randomNumber(5)),
    g2: [randomNumber(5)],
    g1: [randomNumber(5)],
    db: [randomNumber(6)]
  };
}

function buildPrizes(area) {
  if (area === 'mien_bac') return buildNorthPrizes();
  return buildSouthCentralPrizes();
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekdayVi(date) {
  const map = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return map[date.getDay()];
}

async function seedProvinces() {
  await Province.deleteMany({});

  await Province.insertMany(
    provinces.map((p) => ({
      ...p,
      active: true
    }))
  );

  console.log(`Seeded provinces: ${provinces.length}`);
}

async function seedResults(days = 365) {
  await Result.deleteMany({});
  await LotteryNumber.deleteMany({});

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let totalResults = 0;

  for (const station of provinces) {
    const docs = [];

    for (let i = 0; i < days; i += 1) {
      const drawDate = new Date(today);
      drawDate.setUTCDate(today.getUTCDate() - i);

      const date = formatDate(drawDate);
      const prizes = buildPrizes(station.area);
      const special = prizes.db?.[0] || '';

      docs.push({
        date,
        drawDate,
        weekday: getWeekdayVi(drawDate),
        area: station.area,
        province: station.province,
        code: station.code,
        prizes,
        special
      });
    }

    const inserted = await Result.insertMany(docs, { ordered: false });
    totalResults += inserted.length;

    for (const result of inserted) {
      await rebuildNumbersForResult(result);
    }

    console.log(`Seeded ${station.code}: ${inserted.length} days`);
  }

  console.log(`Seeded results: ${totalResults}`);
}

async function main() {
  if (!MONGO_URI) {
    throw new Error('Missing MONGO_URI or MONGODB_URI in .env');
  }

  await mongoose.connect(MONGO_URI);

  const days = Number(process.argv[2]) || 365;

  console.log(`Start seed-all with ${days} days per province/station...`);

  await seedProvinces();
  await seedResults(days);

  console.log('Seed all done.');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});