const express = require('express');
const router = express.Router();
const upload = require('../Middlewares/upload'); 
const productController = require('../Controllers/product');
const { isAuthenticated } = require('../Middlewares/auth');

router.get('/', isAuthenticated, productController.listProducts);

// Waste saved by day/hour (for dashboard chart)
// NOTE: must be declared BEFORE `/:id` route to avoid being treated as an id.
router.get('/waste-saved-vs-day', isAuthenticated, productController.getWasteSavedVsDay);

router.get('/:id', isAuthenticated, productController.getProduct);

router.post('/', isAuthenticated, upload.single('image'), productController.addProduct);
router.put('/:id', isAuthenticated, upload.single('image'), productController.updateProduct);
router.delete('/:id', isAuthenticated, productController.deleteProduct);
router.put('/:id/stock', isAuthenticated, productController.updateStock);

router.post('/:id/optimize', isAuthenticated, productController.optimizePrice);
router.post('/:id/analyze-freshness', isAuthenticated, upload.single('image'), productController.analyzeFreshness);

// Backfill projected/optimized waste values for dashboard charts
router.post('/backfill-waste-values', isAuthenticated, productController.backfillWasteValues);

module.exports = router;
