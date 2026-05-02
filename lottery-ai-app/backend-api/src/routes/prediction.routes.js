const express = require('express');
const predictionService = require('../services/prediction.service');
const router = express.Router();

router.get('/today', async (req, res, next) => {
  try {
    const prediction = await predictionService.getTodayPrediction(req.query.region || 'MB');
    res.json({ data: prediction });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const prediction = await predictionService.generatePrediction({
      region: req.query.region || req.body.region || 'MB',
      topK: req.query.topK || req.body.topK || 10
    });

    res.status(201).json({
      data: prediction,
      disclaimer: 'Statistical reference only. No guaranteed winning.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
