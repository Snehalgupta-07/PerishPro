const Donation = require('../Models/Donation');
const Product = require('../Models/Product');
const User = require('../Models/user');
const { sendDonationEmail } = require('../lib/mailer');

const createDonation = async (req, res) => {
  try {
    const { items, shelterInfo, pickupDate, notes } = req.body;
    const storeId = req.user ? req.user._id : null;
    
    // Get store details for email
    let storeName = 'PerishPro Partner';
    if (storeId) {
      const user = await User.findById(storeId);
      if (user && user.storeName) {
        storeName = user.storeName;
      }
    }

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'No items selected for donation' });
    }
    if (!shelterInfo || !shelterInfo.name || !shelterInfo.email) {
      return res.status(400).json({ success: false, message: 'Invalid shelter contact details' });
    }
    if (!pickupDate) {
      return res.status(400).json({ success: false, message: 'Pickup date is required' });
    }

    let totalWriteOffValue = 0;
    let totalItemsCount = 0;
    const resolvedItems = [];

    // Deduct stock and compile final donation item list
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.name}` });
      }

      const qtyToDonate = Math.min(product.stock.quantity, Number(item.quantity));
      if (qtyToDonate <= 0) {
        continue; // skip products with no stock to donate
      }

      // Deduct quantity from product stock
      product.stock.quantity -= qtyToDonate;
      
      // Save the updated product stock
      await product.save();

      const costPrice = product.pricing.costPrice || 0;
      totalWriteOffValue += qtyToDonate * costPrice;
      totalItemsCount += qtyToDonate;

      resolvedItems.push({
        productId: product._id,
        name: product.name,
        category: product.category,
        quantity: qtyToDonate,
        unit: product.stock.unit || 'units',
        costPrice: costPrice,
        mrp: product.pricing.mrp || 0,
        expiryDate: product.perishable.expiryDate
      });
    }

    if (resolvedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No products had available stock to donate' });
    }

    // Save donation record
    const donation = new Donation({
      storeId,
      items: resolvedItems,
      shelterInfo,
      pickupDate: new Date(pickupDate),
      notes: notes || '',
      totalWriteOffValue,
      totalItemsCount,
      status: 'dispatched'
    });

    await donation.save();

    // Send email alert to shelter
    let emailPreviewUrl = null;
    try {
      const emailResult = await sendDonationEmail(
        shelterInfo.email,
        shelterInfo.name,
        { items: resolvedItems, totalItemsCount, pickupDate },
        storeName
      );
      if (typeof emailResult === 'string') {
        emailPreviewUrl = emailResult; // Ethereal link
      }
    } catch (emailErr) {
      console.error('Failed to send donation email alert', emailErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Donation dispatched successfully',
      donation,
      emailPreviewUrl
    });
  } catch (err) {
    console.error('createDonation error', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch donation' });
  }
};

const listDonations = async (req, res) => {
  try {
    const storeId = req.user ? req.user._id : null;
    const filter = {};
    if (storeId) filter.storeId = storeId;

    const donations = await Donation.find(filter).sort({ donationDate: -1 });
    return res.status(200).json({ success: true, donations });
  } catch (err) {
    console.error('listDonations error', err);
    return res.status(500).json({ success: false, message: 'Failed to load donations list' });
  }
};

const getDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }
    return res.status(200).json({ success: true, donation });
  } catch (err) {
    console.error('getDonation error', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve donation details' });
  }
};

module.exports = {
  createDonation,
  listDonations,
  getDonation
};
