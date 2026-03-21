const mongoose = require('mongoose');
const { Schema } = mongoose;

const PricePredictionSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    predictionDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    currentMetrics: {
      currentPrice: { type: Number, required: true, min: 0 },
      stockLevel: { type: Number, required: true, min: 0 },
      daysToExpiry: { type: Number, required: true, min: 0 },
      demandScore: { type: Number, required: true, min: 0, max: 100 }
    },
    recommendations: {
      optimalPrice: { type: Number, required: true, min: 0 },
      priceChangePercent: { type: Number, required: true },
      confidenceScore: { type: Number, required: true, min: 0, max: 100 }
    },
    scenarios: {
      current: {
        expectedSales: { type: Number, required: true, min: 0 },
        expectedRevenue: { type: Number, required: true, min: 0 },
        expectedWaste: { type: Number, required: true, min: 0 },
        expectedProfit: { type: Number, required: true }
      },
      optimal: {
        expectedSales: { type: Number, required: true, min: 0 },
        expectedRevenue: { type: Number, required: true, min: 0 },
        expectedWaste: { type: Number, required: true, min: 0 },
        expectedProfit: { type: Number, required: true }
      },
      aggressive: {
        price: { type: Number, required: true, min: 0 },
        expectedSales: { type: Number, required: true, min: 0 },
        expectedRevenue: { type: Number, required: true, min: 0 },
        expectedWaste: { type: Number, required: true, min: 0 },
        expectedProfit: { type: Number, required: true }
      }
    },
    forecast: [
      {
        day: { type: Number, required: true },
        recommendedPrice: { type: Number, required: true, min: 0 },
        expectedDemand: { type: Number, required: true, min: 0, max: 100 },
        expectedSales: { type: Number, required: true, min: 0 }
      }
    ],
    impact: {
      wasteReduction: { type: Number, required: true, min: 0, max: 100 },
      profitIncrease: { type: Number, required: true },
      revenueChange: { type: Number, required: true }
    },
    implemented: {
      type: Boolean,
      default: false
    },
    implementedAt: {
      type: Date
    },
    actualResults: {
      actualSales: { type: Number, min: 0 },
      actualRevenue: { type: Number, min: 0 },
      actualWaste: { type: Number, min: 0 },
      actualProfit: { type: Number },
      accuracy: { type: Number, min: 0, max: 100 }
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Indexes
PricePredictionSchema.index({ productId: 1, predictionDate: -1 });
PricePredictionSchema.index({ implemented: 1 });
PricePredictionSchema.index({ expiresAt: 1 });
PricePredictionSchema.index({ 'recommendations.confidenceScore': -1 });

// TTL index to auto-delete expired predictions
PricePredictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiration
PricePredictionSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const productExpiryDate = new Date();
    productExpiryDate.setDate(productExpiryDate.getDate() + (this.currentMetrics?.daysToExpiry || 0));

    this.expiresAt = sevenDaysFromNow < productExpiryDate ? sevenDaysFromNow : productExpiryDate;
  }
  next();
});

const PricePrediction = mongoose.model('PricePrediction', PricePredictionSchema);

module.exports = PricePrediction;
