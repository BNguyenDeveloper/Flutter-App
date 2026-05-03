const mongoose = require('mongoose');

const LotteryNumberSchema = new mongoose.Schema(
  {
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', required: true, index: true },
    area: { type: String, required: true, index: true },
    province: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    date: { type: String, required: true, trim: true, index: true },
    drawDate: { type: Date, required: true, index: true },
    prize: { type: String, required: true, trim: true, lowercase: true },
    fullNumber: { type: String, required: true, trim: true },
    last2: { type: String, match: /^\d{2}$/ },
    last3: { type: String, match: /^\d{3}$/ },
    head2: { type: String, match: /^\d{2}$/ },
    head3: { type: String, match: /^\d{3}$/ },
    isSpecial: { type: Boolean, default: false }
  },
  { timestamps: true }
);

LotteryNumberSchema.index({ code: 1, last2: 1, drawDate: -1 });
LotteryNumberSchema.index({ code: 1, last3: 1, drawDate: -1 });
LotteryNumberSchema.index({ code: 1, prize: 1, drawDate: -1 });
LotteryNumberSchema.index({ code: 1, isSpecial: 1, last2: 1, drawDate: -1 });
LotteryNumberSchema.index({ area: 1, last2: 1, drawDate: -1 });
LotteryNumberSchema.index({ resultId: 1, prize: 1, fullNumber: 1 }, { unique: true });

module.exports = mongoose.model('LotteryNumber', LotteryNumberSchema);
