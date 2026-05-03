const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Province = require('../src/models/Province');

dotenv.config();

const provinces = [
  { area: 'mien_bac', province: 'Miền Bắc', code: 'XSMB', displayName: 'Xổ số Miền Bắc' },

  { area: 'mien_nam', province: 'TPHCM', code: 'XSHCM', displayName: 'Xổ số TPHCM' },
  { area: 'mien_nam', province: 'An Giang', code: 'XSAG', displayName: 'Xổ số An Giang' },
  { area: 'mien_nam', province: 'Bình Dương', code: 'XSBD', displayName: 'Xổ số Bình Dương' },
  { area: 'mien_nam', province: 'Bạc Liêu', code: 'XSBL', displayName: 'Xổ số Bạc Liêu' },
  { area: 'mien_nam', province: 'Bình Phước', code: 'XSBP', displayName: 'Xổ số Bình Phước' },
  { area: 'mien_nam', province: 'Bến Tre', code: 'XSBT', displayName: 'Xổ số Bến Tre' },
  { area: 'mien_nam', province: 'Bình Thuận', code: 'XSBTH', displayName: 'Xổ số Bình Thuận' },
  { area: 'mien_nam', province: 'Cà Mau', code: 'XSCM', displayName: 'Xổ số Cà Mau' },
  { area: 'mien_nam', province: 'Cần Thơ', code: 'XSCT', displayName: 'Xổ số Cần Thơ' },
  { area: 'mien_nam', province: 'Đà Lạt', code: 'XSDL', displayName: 'Xổ số Đà Lạt' },
  { area: 'mien_nam', province: 'Đồng Nai', code: 'XSDN', displayName: 'Xổ số Đồng Nai' },
  { area: 'mien_nam', province: 'Đồng Tháp', code: 'XSDT', displayName: 'Xổ số Đồng Tháp' },
  { area: 'mien_nam', province: 'Hậu Giang', code: 'XSHG', displayName: 'Xổ số Hậu Giang' },
  { area: 'mien_nam', province: 'Kiên Giang', code: 'XSKG', displayName: 'Xổ số Kiên Giang' },
  { area: 'mien_nam', province: 'Long An', code: 'XSLA', displayName: 'Xổ số Long An' },
  { area: 'mien_nam', province: 'Sóc Trăng', code: 'XSST', displayName: 'Xổ số Sóc Trăng' },
  { area: 'mien_nam', province: 'Tiền Giang', code: 'XSTG', displayName: 'Xổ số Tiền Giang' },
  { area: 'mien_nam', province: 'Tây Ninh', code: 'XSTN', displayName: 'Xổ số Tây Ninh' },
  { area: 'mien_nam', province: 'Trà Vinh', code: 'XSTV', displayName: 'Xổ số Trà Vinh' },
  { area: 'mien_nam', province: 'Vĩnh Long', code: 'SXVL', displayName: 'Xổ số Vĩnh Long' },
  { area: 'mien_nam', province: 'Vũng Tàu', code: 'XSVT', displayName: 'Xổ số Vũng Tàu' },

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
  { area: 'mien_trung', province: 'Quảng Nam', code: 'XSQNA', displayName: 'Xổ số Quảng Nam' },
  { area: 'mien_trung', province: 'Quảng Trị', code: 'XSQT', displayName: 'Xổ số Quảng Trị' },
  { area: 'mien_trung', province: 'Thừa Thiên Huế', code: 'XSTTH', displayName: 'Xổ số Thừa Thiên Huế' }
];

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery_ai_app';
  await mongoose.connect(uri);

  for (const item of provinces) {
    await Province.findOneAndUpdate(
      { code: item.code },
      { ...item, active: true },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${provinces.length} provinces/stations`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
