const mongoose = require('mongoose');
const { Schema } = mongoose;

const WasteLogSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    productName: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be positive']
    },
    unit: {
      type: String,
      required: true
    },
    costValue: {
      type: Number,
      required: true,
      min: 0
    },
    retailValue: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      enum: ['expired', 'spoiled', 'damaged', 'overstocked', 'quality-issue', 'other']
    },
    details: {
      type: String,
      maxlength: [500, 'Details cannot exceed 500 characters']
    },
    perishableInfo: {
      manufactureDate: {
        type: Date,
        required: true
      },
      expiryDate: {
        type: Date,
        required: true
      },
      daysExpired: {
        type: Number,
        default: 0
      }
    },
    prevention: {
      couldBePreventedByAI: {
        type: Boolean,
        default: false
      },
      preventionMethod: {
        type: String
      },
      estimatedSavings: {
        type: Number,
        min: 0
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
WasteLogSchema.index({ productId: 1 });
WasteLogSchema.index({ reason: 1 });
WasteLogSchema.index({ category: 1 });

// Pre-save middleware to calculate days expired
WasteLogSchema.pre('save', function (next) {
  if (this.perishableInfo && this.perishableInfo.expiryDate) {
    const diffTime = Date.now() - this.perishableInfo.expiryDate.getTime();
    this.perishableInfo.daysExpired = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  next();
});

// Virtual field for waste percentage
WasteLogSchema.virtual('wastePercent').get(function () {
  return this.retailValue > 0 ? ((this.costValue / this.retailValue) * 100).toFixed(2) : 0;
});

const WasteLog = mongoose.model('WasteLog', WasteLogSchema);

module.exports = WasteLog;
