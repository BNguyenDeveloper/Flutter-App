const express = require('express');
const analysisService = require('../services/analysis.service');
const router = express.Router();

router.get('/frequency', async (req, res, next) => {
  try {
    const data = await analysisService.getFrequency({
      area: req.query.area,
      province: req.query.province,
      code: req.query.code,
      region: req.query.region || 'XSMB',
      days: req.query.days || 30,
      type: req.query.type || 'last2',
      isSpecial: req.query.isSpecial
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/hot-cold', async (req, res, next) => {
  try {
    const data = await analysisService.getHotCold({
      area: req.query.area,
      province: req.query.province,
      code: req.query.code,
      region: req.query.region || 'XSMB',
      days: req.query.days || 30,
      size: req.query.size || 10
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/gap', async (req, res, next) => {
  try {
    const data = await analysisService.getGap({
      area: req.query.area,
      province: req.query.province,
      code: req.query.code,
      region: req.query.region || 'XSMB'
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
