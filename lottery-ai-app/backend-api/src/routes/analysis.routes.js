const express = require('express');
const analysisService = require('../services/analysis.service');
const router = express.Router();

router.get('/frequency', async (req, res, next) => {
  try {
    const data = await analysisService.getFrequency({
      region: req.query.region || 'MB',
      days: req.query.days || 30
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/hot-cold', async (req, res, next) => {
  try {
    const data = await analysisService.getHotCold({
      region: req.query.region || 'MB',
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
    const data = await analysisService.getGap({ region: req.query.region || 'MB' });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
