const express = require('express');
const predictionService = require('../services/prediction.service');
const router = express.Router();

router.get('/today', async (req, res, next) => {
  try {
    const prediction = await predictionService.getTodayPrediction({
      area: req.query.area,
      province: req.query.province,
      code: req.query.code,
      region: req.query.region,
      date: req.query.date
    });
    res.json({ data: prediction });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const prediction = await predictionService.generatePrediction({
      area: req.query.area || req.body.area,
      province: req.query.province || req.body.province,
      code: req.query.code || req.body.code,
      region: req.query.region || req.body.region || 'XSMB',
      topK: req.query.topK || req.body.topK || 10,
      signalDate: req.query.signalDate || req.body.signalDate,
      predictDate: req.query.predictDate || req.body.predictDate,
      recentDays: req.query.recentDays || req.body.recentDays
    });

    res.status(201).json({
      data: prediction,
      disclaimer: 'Chỉ dùng để tham khảo thống kê, không đảm bảo trúng thưởng.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
