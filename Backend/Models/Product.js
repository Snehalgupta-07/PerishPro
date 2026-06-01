const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: false
    },
    sku: {
      type: String,
      trim: true,
      required: false
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Beverages']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
      type: String
    },
    pricing: {
      costPrice: {
        type: Number,
        required: [true, 'Cost price is required'],
        min: [0, 'Cost price must be positive']
      },
      mrp: {
        type: Number,
        required: [true, 'MRP is required'],
        min: [0, 'MRP must be positive']
      },
      currentPrice: {
        type: Number,
        required: [true, 'Current price is required'],
        min: [0, 'Current price must be positive']
      },
      profitMargin: {
        type: Number,
        default: 0
      }
    },
    stock: {
      quantity: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock quantity cannot be negative'],
        default: 0
        // removed: index: true
      },
      unit: {
        type: String,
        required: true,
        enum: ['kg', 'g', 'lb', 'oz', 'l', 'ml', 'units', 'dozen'],
        default: 'units'
      },
      reorderLevel: {
        type: Number,
        default: 0,
        min: [0, 'Reorder level cannot be negative']
      }
    },
    aiMetrics: {
      mlProductId: { type: String, index: true }, // <-- ID used by the Flask model’s dataset
      recommendedPrice: { type: Number },
      confidenceScore: { type: Number },
      modelVersion: { type: String },             // optional, handy for debugging
      lastOptimizedAt: { type: Date },            // optional

      // Monetary wastage values (used by Dashboard "Total Wastage Saved")
      // "projected" = expected waste cost with current price
      // "optimized" = expected waste cost with ML recommended price
      projectedWasteValue: { type: Number },
      optimizedWasteValue: { type: Number },

      // Helpful for UI/debugging (ML returns this as a percent)
      wasteReduction: { type: Number },

      // CV Freshness Analysis fields
      spoilageRisk: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      browningIndex: { type: Number },
      annotatedImage: { type: String }
    },

    pricing: {
    currentPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    previousPrice: { type: Number, default: null },        // store the immediate previous price
    // optional history for audit
    priceHistory: [
      {
        price: Number,
        changedAt: { type: Date, default: Date.now },
        reason: String, // e.g. 'ml_optimize'
        user: String
      }
    ]
  },
  // ...
// });
    perishable: {
      manufactureDate: {
        type: Date,
        required: [true, 'Manufacture date is required']
      },
      expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required']
      },
      shelfLife: {
        type: Number,
        required: true
      },
      daysToExpiry: {
        type: Number,
        default: 0
      }
    },
    // ... rest unchanged ...
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

ProductSchema.index({ storeId: 1, category: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ 'perishable.expiryDate': 1 });
ProductSchema.index({ 'stock.quantity': 1 });
ProductSchema.index({ name: 'text', description: 'text' });


// Pre-save middleware to calculate derived fields
ProductSchema.pre('save', function (next) {
  try {
    // Calculate profit margin (guard against division by zero)
    const cost = Number(this.pricing?.costPrice ?? 0);
    const current = Number(this.pricing?.currentPrice ?? 0);
    if (!isNaN(cost) && cost > 0 && !isNaN(current)) {
      this.pricing.profitMargin = ((current - cost) / cost) * 100;
    } else {
      this.pricing.profitMargin = 0;
    }

    // Calculate shelf life (in days)
    if (this.perishable?.manufactureDate && this.perishable?.expiryDate) {
      const diffTime = new Date(this.perishable.expiryDate).getTime() - new Date(this.perishable.manufactureDate).getTime();
      this.perishable.shelfLife = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Calculate days to expiry
    if (this.perishable?.expiryDate) {
      const diffTime = new Date(this.perishable.expiryDate).getTime() - Date.now();
      this.perishable.daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      this.perishable.daysToExpiry = 0;
    }

    // Auto-update status based on stock and expiry
    if (typeof this.perishable?.daysToExpiry === 'number' && this.perishable.daysToExpiry <= 0) {
      this.status = 'expired';
    } else if (typeof this.perishable?.daysToExpiry === 'number' && this.perishable.daysToExpiry <= 3) {
      this.status = 'expiring-soon';
    } else if (typeof this.stock?.quantity === 'number' && typeof this.stock?.reorderLevel === 'number' && this.stock.quantity <= this.stock.reorderLevel) {
      this.status = 'low-stock';
    } else if (this.status !== 'discontinued') {
      this.status = 'active';
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Virtual for formatted price
ProductSchema.virtual('formattedPrice').get(function () {
  const price = this.pricing?.currentPrice;
  if (typeof price === 'number' && !isNaN(price)) {
    return `$${price.toFixed(2)}`;
  }
  return null;
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function () {
  const qty = this.stock?.quantity ?? 0;
  const reorder = this.stock?.reorderLevel ?? 0;
  if (qty === 0) return 'Out of Stock';
  if (qty <= reorder) return 'Low Stock';
  return 'In Stock';
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;