const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    drawDate: { type: Date, required: true, index: true },

    area: {
      type: String,
      enum: ['mien_bac', 'mien_trung', 'mien_nam'],
      required: true,
      index: true
    },

    province: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },

    weekday: { type: String, default: '' },
    prizes: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    special: { type: String, default: '' }
  },
  { timestamps: true }
);

ResultSchema.index({ code: 1, date: 1 }, { unique: true });
ResultSchema.index({ code: 1, drawDate: -1 });
ResultSchema.index({ area: 1, drawDate: -1 });
ResultSchema.index({ province: 1, drawDate: -1 });

module.exports = mongoose.model('Result', ResultSchema);