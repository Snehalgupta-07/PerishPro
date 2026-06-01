const mongoose = require('mongoose');
const { Schema } = mongoose;

const DonationSchema = new Schema(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        name: { type: String, required: true },
        category: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        costPrice: { type: Number, required: true },
        mrp: { type: Number, required: true },
        expiryDate: { type: Date, required: true }
      }
    ],
    shelterInfo: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true }
    },
    status: {
      type: String,
      enum: ['dispatched', 'received'],
      default: 'dispatched'
    },
    donationDate: {
      type: Date,
      default: Date.now
    },
    pickupDate: {
      type: Date,
      required: true
    },
    totalWriteOffValue: {
      type: Number,
      required: true
    },
    totalItemsCount: {
      type: Number,
      required: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Donation', DonationSchema);
