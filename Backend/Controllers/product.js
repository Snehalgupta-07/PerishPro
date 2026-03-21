const mongoose = require('mongoose');
const { z } = require('zod');
const Product = require('../Models/Product');
const cloudinary = require('../lib/cloudinary');
const streamifier = require('streamifier');
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:8000';

const pricingSchema = z.object({
  costPrice: z.number().min(0),
  mrp: z.number().min(0),
  currentPrice: z.number().min(0),
  profitMargin: z.number().optional()
});

const stockSchema = z.object({
  quantity: z.number().min(0),
  unit: z.string().optional(),
  reorderLevel: z.number().min(0).optional()
});

const perishableSchema = z.object({
  manufactureDate: z.preprocess((d) => (d ? new Date(d) : d), z.date()),
  expiryDate: z.preprocess((d) => (d ? new Date(d) : d), z.date()),
  shelfLife: z.number().optional(),
  daysToExpiry: z.number().optional()
});

const aiMetricsSchema = z
  .object({
    // 👇 allow but don’t require on create; optimizePrice will enforce it
    mlProductId: z.string().min(1).optional(),
    demandScore: z.number().min(0).max(100).optional(),
    spoilageRisk: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    recommendedPrice: z.number().min(0).optional(),
    confidenceScore: z.number().min(0).max(100).optional(),
    modelVersion: z.string().optional(),
    lastPredictionDate: z.preprocess((d) => (d ? new Date(d) : d), z.date()).optional(),
    lastOptimizedAt: z.preprocess((d) => (d ? new Date(d) : d), z.date()).optional(),
    lastOptimization: z.any().optional()
  })
  .optional();

const salesSchema = z
  .object({
    totalSold: z.number().min(0).optional(),
    totalRevenue: z.number().min(0).optional(),
    averageDailySales: z.number().min(0).optional(),
    lastSaleDate: z.preprocess((d) => (d ? new Date(d) : d), z.date()).optional()
  })
  .optional();

const createProductSchema = z.object({
  storeId: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1).max(200),
  category: z.enum(['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Beverages']),
  description: z.string().max(1000).optional(),
  image: z.string().optional(),
  pricing: pricingSchema,
  stock: stockSchema,
  perishable: perishableSchema,
  aiMetrics: aiMetricsSchema,
  sales: salesSchema,
  status: z.enum(['active', 'low-stock', 'expiring-soon', 'expired', 'discontinued']).optional(),
  updatedBy: z.string().optional()
});

const updateProductSchema = createProductSchema.partial();

const toObjectId = (id) => {
  try {
    return mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const uploadBufferToCloudinary = async (buffer, folder = 'perishpro_products') => {
  try {
    if (cloudinary && cloudinary.uploader && typeof cloudinary.uploader.upload_stream === 'function') {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
    }

    if (cloudinary && cloudinary.uploader && typeof cloudinary.uploader.upload === 'function') {
      let mime = 'image/jpeg';
      if (buffer && buffer.length >= 8) {
        const header = buffer.slice(0, 8).toString('hex');
        if (header.startsWith('89504e47')) mime = 'image/png';
        if (header.startsWith('47494638')) mime = 'image/gif';
      }
      const base64 = buffer.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;
      const result = await cloudinary.uploader.upload(dataUri, { folder, resource_type: 'image' });
      return result;
    }

    throw new Error('Cloudinary uploader not available');
  } catch (err) {
    throw err;
  }
};

// ===== LIST PRODUCTS
const listProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const { search, category, status, storeId, sortBy, sortOrder } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (storeId) {
      const oid = toObjectId(storeId);
      if (oid) filter.storeId = oid;
    }
    if (search) filter.$text = { $search: String(search) };

    const sort = {};
    if (sortBy) {
      sort[String(sortBy)] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
      Product.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, page, limit, total, products: items });
  } catch (err) {
    console.error('listProducts error', err);
    return res.status(500).json({ success: false, message: 'Failed to list products' });
  }
};

// ===== GET PRODUCT
const getProduct = async (req, res) => {
  try {
    const oid = req.params.id;
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid product id' });

    const product = await Product.findById(oid).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    return res.status(200).json({ success: true, product });
  } catch (err) {
    console.error('getProduct error', err);
    return res.status(500).json({ success: false, message: 'Failed to get product' });
  }
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ===== ADD PRODUCT
const addProduct = async (req, res) => {
  try {
    // 1) Handle image upload (if any)
    if (req.file) {
      try {
        if (req.file.buffer) {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
          req.body.image = uploadResult.secure_url || uploadResult.url;
        } else if (req.file.path) {
          const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: 'perishpro_products' });
          req.body.image = uploadResult.secure_url || uploadResult.url;
        }
      } catch (uploadErr) {
        console.error('Cloudinary upload failed', uploadErr);
        return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadErr.message });
      }
    }

    // 2) If client used form-data and sent JSON under 'data', parse it
    let bodyToValidate = req.body;
    if (req.body && typeof req.body.data === 'string') {
      try {
        bodyToValidate = JSON.parse(req.body.data);
        if (req.body.image) bodyToValidate.image = req.body.image;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid JSON in data field' });
      }
    }

    // 3) Compute perishable derived fields
    if (bodyToValidate.perishable) {
      try {
        const mfg = bodyToValidate.perishable.manufactureDate ? new Date(bodyToValidate.perishable.manufactureDate) : null;
        const exp = bodyToValidate.perishable.expiryDate ? new Date(bodyToValidate.perishable.expiryDate) : null;

        if (mfg instanceof Date && !isNaN(mfg) && exp instanceof Date && !isNaN(exp)) {
          const diffDays = Math.max(0, Math.ceil((exp.getTime() - mfg.getTime()) / MS_PER_DAY));
          bodyToValidate.perishable.shelfLife = diffDays;

          const daysToExpiry = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / MS_PER_DAY));
          bodyToValidate.perishable.daysToExpiry = daysToExpiry;
        }
      } catch (computeErr) {
        console.warn('Failed to compute perishable derived fields', computeErr);
      }
    }

    // 4) Validate with zod
    const parsed = createProductSchema.safeParse(bodyToValidate);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
        .join(', ');
      return res.status(400).json({ success: false, message });
    }

    // 5) Attach updatedBy if authenticated
    const payload = parsed.data;
    if (req.user && req.user._id) payload.updatedBy = req.user._id;

    // 6) Save
    const product = new Product(payload);
    await product.save();

    return res.status(201).json({ success: true, message: 'Product created', product });
  } catch (err) {
    console.error('addProduct error', err);
    if (err.name === 'ValidationError') {
      const msgs = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, message: msgs });
    }
    return res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

// ===== UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const oid = req.params.id;
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid product id' });

    // 1) Handle image upload if present
    if (req.file) {
      try {
        if (req.file.buffer) {
          const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
          req.body.image = uploadResult.secure_url || uploadResult.url;
        } else if (req.file.path) {
          const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: 'perishpro_products' });
          req.body.image = uploadResult.secure_url || uploadResult.url;
        }
      } catch (uploadErr) {
        console.error('Cloudinary upload failed', uploadErr);
        return res.status(500).json({ success: false, message: 'Image upload failed', error: uploadErr.message });
      }
    }

    // 2) Parse form-data 'data' JSON if sent
    let bodyToValidate = req.body;
    if (req.body && typeof req.body.data === 'string') {
      try {
        bodyToValidate = JSON.parse(req.body.data);
        if (req.body.image) bodyToValidate.image = req.body.image;
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid JSON in data field' });
      }
    }

    // 3) Compute perishable derived fields if provided
    if (bodyToValidate.perishable) {
      try {
        const mfg = bodyToValidate.perishable.manufactureDate ? new Date(bodyToValidate.perishable.manufactureDate) : null;
        const exp = bodyToValidate.perishable.expiryDate ? new Date(bodyToValidate.perishable.expiryDate) : null;

        if (mfg instanceof Date && !isNaN(mfg) && exp instanceof Date && !isNaN(exp)) {
          bodyToValidate.perishable.shelfLife = Math.max(0, Math.ceil((exp.getTime() - mfg.getTime()) / MS_PER_DAY));
          bodyToValidate.perishable.daysToExpiry = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / MS_PER_DAY));
        }
      } catch (computeErr) {
        console.warn('Failed to compute perishable derived fields during update', computeErr);
      }
    }

    // 4) Validate update payload (partial)
    const parsed = updateProductSchema.safeParse(bodyToValidate);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
        .join(', ');
      return res.status(400).json({ success: false, message });
    }

    const updates = parsed.data;
    if (req.user && req.user._id) updates.updatedBy = req.user._id;

    // 5) Apply update
    const updated = await Product.findByIdAndUpdate(
      oid,
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });

    return res.status(200).json({ success: true, message: 'Product updated', product: updated });
  } catch (err) {
    console.error('updateProduct error', err);
    if (err.name === 'ValidationError') {
      const msgs = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, message: msgs });
    }
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};
// // Delete Product (soft delete by default; hard delete if ?force=true)
// const deleteProduct = async () => {
//   if (!selectedProduct) return;
//   const id = selectedProduct._id ?? selectedProduct.id;
//   if (!id) return;

//   setActionLoading(true);
//   setErrorMessage('');

//   try {
//     console.debug('Deleting id:', id);

//     // Request hard delete (force=true)
//     const resp = await productService.deleteProduct(String(id), { force: true });

//     console.debug('DELETE response:', resp);

//     if (resp && resp.success) {
//       // remove from UI only after server confirms deletion
//       setProducts(prev => prev.filter(p => (p._id ?? p.id) !== id));
//       setSuccessMessage(`${selectedProduct.name} permanently deleted`);
//       setTimeout(() => setSuccessMessage(''), 3000);
//       setIsDeleteModalOpen(false);
//     } else {
//       // backend returned something unexpected
//       const msg = resp?.message || 'Delete failed';
//       setErrorMessage(msg);
//       setTimeout(() => setErrorMessage(''), 5000);
//     }
//   } catch (err) {
//     const errorMsg = typeof err === 'string'
//       ? err
//       : (err?.response?.data?.message ?? err?.message ?? 'Failed to delete product');
//     setErrorMessage(errorMsg);
//     setTimeout(() => setErrorMessage(''), 5000);
//     console.error('deleteProduct error (frontend):', err);
//   } finally {
//     setActionLoading(false);
//   }
// };

const deleteProduct = async (req, res) => {
  try {
    const oid = req.params.id;
    const force = req.query.force === 'true';

    if (!oid) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }

    // Validate ObjectId early (avoids cast errors)
    if (!mongoose.Types.ObjectId.isValid(oid)) {
      return res.status(400).json({ success: false, message: 'Invalid product id format' });
    }

    if (force) {
      // Hard delete
      const removed = await Product.findByIdAndDelete(oid);
      if (!removed) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.status(200).json({ success: true, message: 'Product permanently deleted' });
    }

    // Soft delete: mark discontinued and set discontinuedAt
    const updated = await Product.findByIdAndUpdate(
      oid,
      { status: 'discontinued', discontinuedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product discontinued (soft deleted)',
      product: updated
    });
  } catch (err) {
    console.error('deleteProduct error', err);
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};


// ===== UPDATE STOCK
const updateStock = async (req, res) => {
  try {
    const oid = req.params.id;
    const { op, amount } = req.body;
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid product id' });
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const product = await Product.findById(oid);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    if (op === 'set') product.stock.quantity = amt;
    else if (op === 'inc') product.stock.quantity = (product.stock.quantity || 0) + amt;
    else if (op === 'dec') product.stock.quantity = Math.max(0, (product.stock.quantity || 0) - amt);
    else return res.status(400).json({ success: false, message: 'Invalid op. Use inc|dec|set' });

    if (req.user && req.user._id) product.updatedBy = req.user._id;
    await product.save();

    return res.status(200).json({ success: true, message: 'Stock updated', product });
  } catch (err) {
    console.error('updateStock error', err);
    return res.status(500).json({ success: false, message: 'Failed to update stock' });
  }
};

// ===== OPTIMIZE PRICE (uses ML productId from aiMetrics)
const optimizePrice = async (req, res) => {
  try {
    const mongoId = req.params.id;
    const product = await Product.findById(mongoId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const mlProductId = product.aiMetrics?.mlProductId;
    if (!mlProductId || typeof mlProductId !== 'string' || !mlProductId.trim()) {
      return res.status(400).json({ success: false, message: 'ML Product ID not set for this item' });
    }

    if (!product.perishable?.expiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date missing for this product' });
    }

    // Prefer precomputed daysToExpiry if present and sane; else compute fresh
    let daysToExpiry = product.perishable?.daysToExpiry;
    if (typeof daysToExpiry !== 'number' || daysToExpiry < 0) {
      const today = new Date();
      const expiry = new Date(product.perishable.expiryDate);
      daysToExpiry = Math.ceil((expiry - today) / MS_PER_DAY);
    }

    if (daysToExpiry <= 0) {
      return res.status(400).json({ success: false, message: 'Product already expired' });
    }

    const stockLevel = Number(product.stock?.quantity ?? 0);

    const payload = {
      productId: mlProductId,        // 👈 send ML product id (not Mongo id)
      stockLevel: stockLevel,
      daysToExpiry: daysToExpiry
    };

    // Call Flask ML API
    const response = await axios.post(`${ML_API_URL}/predict`, payload, { timeout: 10000 });
    const mlData = response.data || {};

    const newPriceRaw = mlData?.recommendations?.optimalPrice;
    const newPrice = Number.isFinite(newPriceRaw) ? Number(newPriceRaw) : NaN;
    if (!Number.isFinite(newPrice)) {
      return res.status(502).json({ success: false, message: 'ML failed to return a valid price' });
    }

    const round2 = (n) => Math.round(n * 100) / 100;
    const prevPriceRaw = Number(product.pricing?.currentPrice ?? 0);
    const prevPrice = Number.isFinite(prevPriceRaw) ? round2(prevPriceRaw) : 0;
    const roundedNew = round2(newPrice);

    // --- NEW: store previous price + push a small history entry ---
    product.pricing = product.pricing || {};
    // only set previousPrice if it's different (keeps it cleaner)
    if (prevPrice !== roundedNew) {
      product.pricing.previousPrice = prevPrice;

      product.pricing.priceHistory = Array.isArray(product.pricing.priceHistory)
        ? product.pricing.priceHistory
        : [];

      // push new history entry at the front (unshift)
      product.pricing.priceHistory.unshift({
        price: prevPrice,
        changedAt: new Date(),
        reason: 'ml_optimize',
        meta: {
          mlProductId,
          daysToExpiry,
          stockLevel
        }
      });

      // optional: keep only last N history entries to avoid unbounded growth
      const MAX_HISTORY = 20;
      if (product.pricing.priceHistory.length > MAX_HISTORY) {
        product.pricing.priceHistory = product.pricing.priceHistory.slice(0, MAX_HISTORY);
      }
    }
    // ----------------------------------------------------------

    // Update DB fields with new ML price and metadata
    product.pricing.currentPrice = roundedNew;
    const projectedWasteValueRaw =
      mlData?.impact?.projectedWasteValue ??
      mlData?.scenarios?.current?.expectedLoss ??
      mlData?.scenarios?.current?.expected_loss;

    const optimizedWasteValueRaw =
      mlData?.impact?.optimizedWasteValue ??
      mlData?.scenarios?.optimal?.expectedLoss ??
      mlData?.scenarios?.optimal?.expected_loss;

    const projectedWasteValue = Number(projectedWasteValueRaw);
    const optimizedWasteValue = Number(optimizedWasteValueRaw);

    const wasteReductionPercentRaw =
      mlData?.impact?.wasteReduction ??
      mlData?.impact?.waste_reduction ??
      mlData?.impact?.wasteReductionPercent;

    const wasteReduction = Number(wasteReductionPercentRaw);

    const aiMetricsUpdate = {
      ...(product.aiMetrics || {}),
      recommendedPrice: roundedNew,
      confidenceScore: Number(mlData?.recommendations?.confidenceScore ?? 0),
      modelVersion: String(mlData?.algorithm?.version || ''),
      lastPredictionDate: mlData?.predictionDate ? new Date(mlData.predictionDate) : new Date(),
      lastOptimizedAt: new Date(),
      lastOptimization: mlData
    };

    if (Number.isFinite(projectedWasteValue)) aiMetricsUpdate.projectedWasteValue = projectedWasteValue;
    if (Number.isFinite(optimizedWasteValue)) aiMetricsUpdate.optimizedWasteValue = optimizedWasteValue;
    if (Number.isFinite(wasteReduction)) aiMetricsUpdate.wasteReduction = wasteReduction;

    product.aiMetrics = aiMetricsUpdate;

    await product.save();

    res.json({
      success: true,
      message: 'Price optimized successfully',
      productId: mongoId,
      mlProductId,
      oldPrice: prevPrice,
      newPrice: product.pricing.currentPrice,
      mlSummary: {
        confidence: product.aiMetrics.confidenceScore,
        modelVersion: product.aiMetrics.modelVersion,
        sellThroughRate: mlData?.impact?.sellThroughRate,
        wasteReduction: mlData?.impact?.wasteReduction,
        projectedWasteValue: product.aiMetrics.projectedWasteValue,
        optimizedWasteValue: product.aiMetrics.optimizedWasteValue,
      },
      raw: mlData
    });
  } catch (error) {
    console.error('ML Optimization Error:', error?.response?.data || error.message || error);
    const status = error?.response?.status || 500;
    const msg = error?.response?.data?.error || error?.response?.data?.message || error.message || 'Failed to optimize price';
    res.status(status).json({ success: false, message: msg });
  }
};

// ===== BACKFILL WASTE VALUES
// Recomputes and persists `aiMetrics.projectedWasteValue` and `aiMetrics.optimizedWasteValue`
// using Flask ML so Dashboard can show "Total Wastage Saved".
const backfillWasteValues = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));

    const products = await Product.find({
      'aiMetrics.mlProductId': { $exists: true, $ne: '' },
      'perishable.expiryDate': { $exists: true, $ne: null }
    }).limit(limit);

    if (!products.length) {
      return res.status(200).json({ success: true, processed: 0, updated: 0 });
    }

    let updated = 0;

    for (const product of products) {
      const mlProductId = product.aiMetrics?.mlProductId;
      if (!mlProductId || typeof mlProductId !== 'string' || !mlProductId.trim()) continue;

      // Prefer precomputed daysToExpiry if present and sane; else compute fresh
      let daysToExpiry = product.perishable?.daysToExpiry;
      if (typeof daysToExpiry !== 'number' || daysToExpiry < 0) {
        const today = new Date();
        const expiry = new Date(product.perishable?.expiryDate);
        daysToExpiry = Math.ceil((expiry - today) / MS_PER_DAY);
      }

      if (daysToExpiry <= 0) continue;

      const stockLevel = Number(product.stock?.quantity ?? 0);

      const payload = {
        productId: mlProductId,
        stockLevel,
        daysToExpiry
      };

      const response = await axios.post(`${ML_API_URL}/predict`, payload, { timeout: 10000 });
      const mlData = response.data || {};

      const projectedWasteValueRaw =
        mlData?.impact?.projectedWasteValue ??
        mlData?.scenarios?.current?.expectedLoss ??
        mlData?.scenarios?.current?.expected_loss;

      const optimizedWasteValueRaw =
        mlData?.impact?.optimizedWasteValue ??
        mlData?.scenarios?.optimal?.expectedLoss ??
        mlData?.scenarios?.optimal?.expected_loss;

      const wasteReductionPercentRaw =
        mlData?.impact?.wasteReduction ??
        mlData?.impact?.waste_reduction ??
        mlData?.impact?.wasteReductionPercent;

      const projectedWasteValue = Number(projectedWasteValueRaw);
      const optimizedWasteValue = Number(optimizedWasteValueRaw);
      const wasteReduction = Number(wasteReductionPercentRaw);

      // Only persist if values are usable
      if (!Number.isFinite(projectedWasteValue) || !Number.isFinite(optimizedWasteValue)) continue;

      product.aiMetrics = product.aiMetrics || {};
      product.aiMetrics.projectedWasteValue = projectedWasteValue;
      product.aiMetrics.optimizedWasteValue = optimizedWasteValue;
      if (Number.isFinite(wasteReduction)) product.aiMetrics.wasteReduction = wasteReduction;

      // keep these in sync as well (optional for dashboard, but helps debug)
      const newPriceRaw = mlData?.recommendations?.optimalPrice;
      if (Number.isFinite(Number(newPriceRaw))) product.aiMetrics.recommendedPrice = Number(newPriceRaw);
      product.aiMetrics.confidenceScore = Number(mlData?.recommendations?.confidenceScore ?? product.aiMetrics.confidenceScore ?? 0);
      product.aiMetrics.lastOptimizedAt = new Date();

      await product.save();
      updated += 1;
    }

    return res.status(200).json({ success: true, processed: products.length, updated });
  } catch (error) {
    console.error('backfillWasteValues error', error?.response?.data || error.message || error);
    const status = error?.response?.status || 500;
    const msg = error?.response?.data?.message || error?.response?.data?.error || error.message || 'Failed to backfill waste values';
    return res.status(status).json({ success: false, message: msg });
  }
};

// ===== WASTE SAVED VS DAY (Dashboard chart)
// Returns aggregated totals of (projectedWasteValue - optimizedWasteValue) per day/hour.
const getWasteSavedVsDay = async (req, res) => {
  try {
    const range = String(req.query.range || '7d');

    const now = new Date();
    let startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let groupFormat = '%Y-%m-%d'; // default day grouping

    if (range === '24h') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      // group by hour
      groupFormat = '%Y-%m-%dT%H:00:00';
    } else if (range === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const pipeline = [
      {
        $match: {
          'aiMetrics.projectedWasteValue': { $ne: null },
          'aiMetrics.optimizedWasteValue': { $ne: null },
          $or: [
            { 'aiMetrics.lastOptimizedAt': { $gte: startDate } },
            { updatedAt: { $gte: startDate } }
          ]
        }
      },
      {
        $project: {
          wasteSaved: {
            $max: [
              { $subtract: ['$aiMetrics.projectedWasteValue', '$aiMetrics.optimizedWasteValue'] },
              0
            ]
          },
          optimizedAt: { $ifNull: ['$aiMetrics.lastOptimizedAt', '$updatedAt'] }
        }
      },
      {
        $project: {
          wasteSaved: 1,
          dayKey: {
            $dateToString: { format: groupFormat, date: '$optimizedAt' }
          }
        }
      },
      {
        $group: {
          _id: '$dayKey',
          wasteSaved: { $sum: '$wasteSaved' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const results = await Product.aggregate(pipeline);
    const data = results.map((r) => ({
      date: r._id,
      wasteSaved: Number(r.wasteSaved || 0)
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getWasteSavedVsDay error', error);
    return res.status(500).json({ success: false, message: 'Failed to load waste chart data' });
  }
};


module.exports = {
  listProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  optimizePrice,
  backfillWasteValues,
  getWasteSavedVsDay
};
