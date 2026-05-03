const express = require('express');
const statsService = require('../services/stats.service');
const router = express.Router();

router.get('/top-frequency', async (req, res, next) => {
  try {
    const data = await statsService.topFrequency({
      code: req.query.code,
      area: req.query.area,
      province: req.query.province,
      type: req.query.type || 'last2',
      days: req.query.days || 3650,
      limit: req.query.limit || 20
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/longest-missing', async (req, res, next) => {
  try {
    const data = await statsService.longestMissing({
      code: req.query.code,
      area: req.query.area,
      province: req.query.province,
      limit: req.query.limit || 20
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/special-frequency', async (req, res, next) => {
  try {
    const data = await statsService.specialFrequency({
      code: req.query.code,
      area: req.query.area,
      province: req.query.province,
      type: req.query.type || 'last2',
      days: req.query.days || 3650,
      limit: req.query.limit || 20
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
