const express = require('express');
const resultService = require('../services/result.service');
const router = express.Router();

router.get('/latest', async (req, res, next) => {
  try {
    const result = await resultService.getLatestResult({
      area: req.query.area,
      province: req.query.province,
      code: req.query.code,
      region: req.query.region
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const results = await resultService.getHistory({
      area: req.query.area,
      province: req.query.province,
      code: req.query.code,
      region: req.query.region,
      limit: req.query.limit
    });
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const result = await resultService.importResult(req.body);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
