const mongoose = require('mongoose');

const PredictionNumberSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, match: /^\d{2}$/ },
    score: { type: Number, required: true, min: 0, max: 1 },
    calibratedProbability: { type: Number, min: 0, max: 1 },
    rank: { type: Number, min: 1 },
    likelyDate: { type: String, default: '', trim: true },
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
    region: { type: String, trim: true, uppercase: true, index: true },
    targetType: { type: String, enum: ['loto', 'special'], default: 'loto', index: true },

    topK: { type: Number, default: 5 },
    horizonDays: { type: Number, default: 7, min: 1, max: 30 },
    validUntil: { type: String, default: '', trim: true },
    numbers: { type: [PredictionNumberSchema], default: [] },
    scores: { type: mongoose.Schema.Types.Mixed, default: {} },
    explanation: { type: String, default: '' },
    modelVersion: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now, index: true },
    model: { type: String, default: 'frequency_gap_markov_ensemble' }
  },
  { timestamps: true }
);

PredictionSchema.index({ date: 1, code: 1, targetType: 1 }, { unique: true });
PredictionSchema.index({ date: 1, region: 1 });
PredictionSchema.index({ code: 1, targetType: 1, date: -1, generatedAt: -1 });

module.exports = mongoose.model('Prediction', PredictionSchema);
