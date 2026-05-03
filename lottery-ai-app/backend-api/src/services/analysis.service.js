const LotteryNumber = require('../models/LotteryNumber');
const Result = require('../models/Result');

function allTwoDigitNumbers() {
  return Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
}

function buildNumberQuery({ area, province, code, region, isSpecial } = {}) {
  const query = {};
  if (code) query.code = String(code).toUpperCase();
  else if (region) query.code = String(region).toUpperCase();
  if (area) query.area = area;
  if (province) query.province = province;
  if (isSpecial !== undefined) query.isSpecial = isSpecial === true || isSpecial === 'true';
  return query;
}

async function getFrequency({ area, province, code, region = 'XSMB', days = 30, type = 'last2', isSpecial } = {}) {
  const safeDays = Math.min(Number(days) || 30, 3650);
  const resultQuery = {};
  if (code) resultQuery.code = String(code).toUpperCase();
  else if (region) resultQuery.$or = [{ code: String(region).toUpperCase() }, { region: String(region).toUpperCase() }];
  if (area) resultQuery.area = area;
  if (province) resultQuery.province = province;

  const results = await Result.find(resultQuery).sort({ drawDate: -1, date: -1 }).limit(safeDays).select('_id').lean();
  const resultIds = results.map((r) => r._id);

  const counts = Object.fromEntries(allTwoDigitNumbers().map((n) => [n, 0]));
  if (!resultIds.length) return Object.entries(counts).map(([number, count]) => ({ number, count }));

  const numberField = type === 'last3' ? '$last3' : '$last2';
  const match = { resultId: { $in: resultIds }, ...buildNumberQuery({ isSpecial }) };
  if (type === 'last3') match.last3 = { $ne: null };
  else match.last2 = { $ne: null };

  const rows = await LotteryNumber.aggregate([
    { $match: match },
    { $group: { _id: numberField, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }
  ]);

  if (type === 'last3') return rows.map((r) => ({ number: r._id, count: r.count }));

  for (const row of rows) counts[row._id] = row.count;
  return Object.entries(counts)
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number.localeCompare(b.number));
}

async function getHotCold({ area, province, code, region = 'XSMB', days = 30, size = 10 } = {}) {
  const frequency = await getFrequency({ area, province, code, region, days, type: 'last2' });
  const safeSize = Math.min(Number(size) || 10, 30);

  return {
    hot: frequency.slice(0, safeSize),
    cold: [...frequency].sort((a, b) => a.count - b.count || a.number.localeCompare(b.number)).slice(0, safeSize)
  };
}

async function getGap({ area, province, code, region = 'XSMB' } = {}) {
  const results = await Result.find(
    code ? { code: String(code).toUpperCase(), ...(area ? { area } : {}), ...(province ? { province } : {}) } : { $or: [{ code: String(region).toUpperCase() }, { region: String(region).toUpperCase() }] }
  )
    .sort({ drawDate: -1, date: -1 })
    .limit(3650)
    .select('_id date drawDate')
    .lean();

  const gaps = Object.fromEntries(allTwoDigitNumbers().map((n) => [n, null]));

  for (let index = 0; index < results.length; index++) {
    const numbers = await LotteryNumber.find({ resultId: results[index]._id }).select('last2').lean();
    for (const item of numbers) {
      if (item.last2 && gaps[item.last2] === null) gaps[item.last2] = index;
    }
  }

  return Object.entries(gaps)
    .map(([number, gap]) => ({ number, gap }))
    .sort((a, b) => {
      if (a.gap === null && b.gap === null) return a.number.localeCompare(b.number);
      if (a.gap === null) return -1;
      if (b.gap === null) return 1;
      return b.gap - a.gap;
    });
}

module.exports = { getFrequency, getHotCold, getGap };
