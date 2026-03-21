// models/Sale.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subdocument for each sold item
const SaleItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
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
    pricePerUnit: {
      type: Number,
      required: true,
      min: [0, 'Price must be positive']
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: [0, 'Cost must be positive']
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal must be positive']
    },
    profit: {
      type: Number,
      required: true
    },
    discount: {
      // keep nested 'type' field but define it explicitly to avoid mongoose confusion
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'fixed'
      },
      value: { type: Number, min: 0, default: 0 },
      reason: { type: String, default: '' }
    }
  },
  { _id: false }
);

const SaleSchema = new Schema(
  {
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    items: {
      type: [SaleItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Sale must have at least one item'
      }
    },
    totals: {
      subtotal: {
        type: Number,
        required: true,
        min: 0
      },
      discount: {
        type: Number,
        default: 0,
        min: 0
      },
      tax: {
        type: Number,
        default: 0,
        min: 0
      },
      total: {
        type: Number,
        required: true,
        min: 0
      },
      profit: {
        type: Number,
        default: 0
      }
    },
    payment: {
      method: {
        type: String,
        required: true,
        enum: ['cash', 'credit-card', 'debit-card', 'mobile-payment', 'other']
      },
      status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'refunded', 'failed'],
        default: 'pending'
      },
      transactionId: {
        type: String
      }
    },
    customer: {
      name: { type: String },
      email: { type: String },
      phone: { type: String }
    },
    metadata: {
      wasExpiringSoon: { type: Boolean, default: false },
      aiPricingUsed: { type: Boolean, default: false },
      wastePreventionSale: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SaleSchema.index({ saleNumber: 1 });
SaleSchema.index({ 'payment.status': 1 });
SaleSchema.index({ createdAt: -1 });

// Pre-save middleware to generate sale number (daily incremental)
SaleSchema.pre('save', async function (next) {
  try {
    // only create saleNumber when missing (new docs)
    if (!this.saleNumber) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

      // start of current day (local)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      // Count documents created today
      const SaleModel = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
      const count = await SaleModel.countDocuments({
        createdAt: { $gte: startOfDay }
      });

      this.saleNumber = `SL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Optional: virtuals for summary info
SaleSchema.virtual('itemCount').get(function () {
  return Array.isArray(this.items) ? this.items.length : 0;
});

SaleSchema.virtual('isPaid').get(function () {
  return this.payment?.status === 'completed';
});

const Sale = mongoose.model('Sale', SaleSchema);

module.exports = Sale;
