const express = require('express');
const provinceService = require('../services/province.service');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const data = await provinceService.listProvinces({ area: req.query.area, active: req.query.active ?? true });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
