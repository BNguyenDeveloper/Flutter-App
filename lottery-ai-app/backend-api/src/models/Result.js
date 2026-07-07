const mongoose = require('mongoose');

const PrizeResultSchema = new mongoose.Schema(
  {
    db: { type: [String], default: [] },
    g1: { type: [String], default: [] },
    g2: { type: [String], default: [] },
    g3: { type: [String], default: [] },
    g4: { type: [String], default: [] },
    g5: { type: [String], default: [] },
    g6: { type: [String], default: [] },
    g7: { type: [String], default: [] },
    g8: { type: [String], default: [] }
  },
  { _id: false }
);

const ResultSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    drawDate: { type: Date, required: true, index: true },

    area: {
      type: String,
      enum: ['mien_bac', 'mien_trung', 'mien_nam'],
      index: true
    },
    code: { type: String, trim: true, uppercase: true, index: true },
    prizes: { type: PrizeResultSchema, default: () => ({}) },
    special: { type: String, default: '', trim: true },
    weekday: { type: String, default: '', trim: true },

    region: {
      type: String,
      enum: ['mien-bac', 'mien-trung', 'mien-nam'],
      index: true
    },

    province: { type: String, required: true, trim: true },
    stationName: { type: String, default: '', trim: true },
    stationCode: { type: String, trim: true, uppercase: true, index: true },
    results: { type: PrizeResultSchema, default: () => ({}) },
    allNumbers2D: { type: [String], default: [] },
    allNumbers3D: { type: [String], default: [] },
    source: { type: String, default: 'unknown', trim: true },
    sourceUrl: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

ResultSchema.index({ date: 1, province: 1 }, { unique: true });
ResultSchema.index({ date: 1 });
ResultSchema.index({ region: 1, date: 1 });
ResultSchema.index({ area: 1, date: 1 });
ResultSchema.index({ code: 1, drawDate: -1 });
ResultSchema.index({ stationCode: 1, drawDate: -1 });
ResultSchema.index({ province: 1, drawDate: -1 });

module.exports = mongoose.model('Result', ResultSchema);
