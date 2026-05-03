const mongoose = require('mongoose');

const MLModelSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true
    },

    modelType: {
      type: String,
      default: 'temporal_cascade_logistic_regression'
    },

    modelVersion: {
      type: String,
      required: true
    },

    trainedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    historyDays: {
      type: Number,
      default: 365
    },

    recentDays: {
      type: Number,
      default: 14
    },

    artifactPath: {
      type: String,
      default: 'mongodb:ml_models'
    },

    metrics: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      totalSamples: Number,
      positiveSamples: Number,
      negativeSamples: Number
    },

    model: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'ml_models'
  }
);

MLModelSchema.index(
  { code: 1, modelVersion: 1 },
  { unique: true }
);

module.exports = mongoose.model('MLModel', MLModelSchema);