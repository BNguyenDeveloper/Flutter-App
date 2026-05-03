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
    area: { type: String, enum: ['mien_bac', 'mien_trung', 'mien_nam'], required: true, index: true },
    province: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },

    // Backward compatibility.
    region: { type: String, trim: true, uppercase: true, index: true },

    numbers: { type: [PredictionNumberSchema], default: [] },
    model: { type: String, default: 'frequency_gap_markov_ensemble' }
  },
  { timestamps: true }
);

PredictionSchema.index({ date: 1, code: 1 }, { unique: true });
PredictionSchema.index({ date: 1, region: 1 });

module.exports = mongoose.model('Prediction', PredictionSchema);
