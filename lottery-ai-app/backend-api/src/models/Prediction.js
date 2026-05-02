const mongoose = require('mongoose');

const PredictionNumberSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, match: /^\d{2}$/ },
    score: { type: Number, required: true, min: 0, max: 1 },
    reason: { type: String, default: '' }
  },
  { _id: false }
);

const PredictionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true, uppercase: true },
    numbers: { type: [PredictionNumberSchema], default: [] },
    model: { type: String, default: 'frequency_gap_markov_ensemble' }
  },
  { timestamps: true }
);

PredictionSchema.index({ date: 1, region: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', PredictionSchema);
