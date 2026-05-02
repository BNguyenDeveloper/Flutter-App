const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true },
    region: { type: String, required: true, trim: true, uppercase: true },
    prizes: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    twoDigits: {
      type: [String],
      required: true,
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.every((n) => /^\d{2}$/.test(n));
        },
        message: 'twoDigits must be an array of 2-digit strings.'
      }
    }
  },
  { timestamps: true }
);

ResultSchema.index({ date: 1, region: 1 }, { unique: true });

module.exports = mongoose.model('Result', ResultSchema);
