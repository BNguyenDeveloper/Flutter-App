const analysisService = require('./analysis.service');

async function topFrequency({ code, area, province, type = 'last2', days = 3650, limit = 20, isSpecial } = {}) {
  const rows = await analysisService.getFrequency({ code, area, province, type, days, isSpecial });
  return rows.slice(0, Math.min(Number(limit) || 20, 100));
}

async function longestMissing({ code, area, province, limit = 20 } = {}) {
  const rows = await analysisService.getGap({ code, area, province });
  return rows.slice(0, Math.min(Number(limit) || 20, 100));
}

async function specialFrequency({ code, area, province, type = 'last2', days = 3650, limit = 20 } = {}) {
  return topFrequency({ code, area, province, type, days, limit, isSpecial: true });
}

module.exports = { topFrequency, longestMissing, specialFrequency };
