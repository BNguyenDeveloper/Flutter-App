const Province = require('../models/Province');

async function listProvinces({ area, active = true } = {}) {
  const query = {};
  if (area) query.area = area;
  if (active !== undefined) query.active = active === true || active === 'true';

  return Province.find(query).sort({ area: 1, province: 1 }).lean();
}

async function getProvinceByCode(code) {
  if (!code) return null;
  return Province.findOne({ code: String(code).toUpperCase(), active: true }).lean();
}

module.exports = { listProvinces, getProvinceByCode };
