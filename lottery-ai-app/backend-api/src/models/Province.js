const mongoose = require('mongoose');

const ProvinceSchema = new mongoose.Schema(
  {
    area: {
      type: String,
      enum: ['mien_bac', 'mien_trung', 'mien_nam'],
      required: true,
      index: true
    },
    province: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    displayName: { type: String, default: '' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

ProvinceSchema.index({ area: 1, active: 1, province: 1 });

module.exports = mongoose.model('Province', ProvinceSchema);
