import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  DollarSign,
  Calendar,
  Hash,
  Tag,
  Image as ImageIcon,
  Info,
  CheckCircle,
  Upload,
  X
} from 'lucide-react';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { addProduct } from '../services/productService';

// 🏭 TRUE Factory Pattern Implementation
// Base Product Class
abstract class BaseProduct {
  constructor(
    public name: string,
    public category: string,
    public basePrice: number,
    public stock: number
  ) {}

  // Abstract methods that each product type must implement
  abstract getShelfLife(): number;
  abstract getStorageRequirements(): string;
  abstract getSpoilageRisk(): 'low' | 'medium' | 'high';
  abstract getPricingStrategy(): { discountFactor: number; urgencyMultiplier: number };
  abstract getOptimalDiscount(daysToExpiry: number): number;

  // Common methods
  getDaysToExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  getProductData() {
    return {
      name: this.name,
      category: this.category,
      shelfLifeHint: this.getShelfLife(),
      storage: this.getStorageRequirements(),
      spoilageRisk: this.getSpoilageRisk(),
      pricingStrategy: this.getPricingStrategy()
    };
  }
}

// Concrete Product Classes
class DairyProduct extends BaseProduct {
  getShelfLife(): number { return 7; }
  getStorageRequirements(): string { return "Cold Storage"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'medium'; }

  getPricingStrategy() {
    return { discountFactor: 0.15, urgencyMultiplier: 1.8 };
  }

  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 1) return 0.25;
    if (daysToExpiry <= 3) return 0.15;
    return 0.05;
  }
}

class ProduceProduct extends BaseProduct {
  getShelfLife(): number { return 3; }
  getStorageRequirements(): string { return "Room Temperature"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'high'; }

  getPricingStrategy() {
    return { discountFactor: 0.25, urgencyMultiplier: 2.2 };
  }

  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 1) return 0.40;
    if (daysToExpiry <= 2) return 0.25;
    return 0.10;
  }
}

class MeatProduct extends BaseProduct {
  getShelfLife(): number { return 5; }
  getStorageRequirements(): string { return "Refrigerated"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'high'; }

  getPricingStrategy() {
    return { discountFactor: 0.20, urgencyMultiplier: 2.0 };
  }

  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 1) return 0.35;
    if (daysToExpiry <= 3) return 0.20;
    return 0.08;
  }
}

class BakeryProduct extends BaseProduct {
  getShelfLife(): number { return 2; }
  getStorageRequirements(): string { return "Dry Place"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'high'; }

  getPricingStrategy() {
    return { discountFactor: 0.30, urgencyMultiplier: 2.5 };
  }

  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 1) return 0.50;
    if (daysToExpiry <= 2) return 0.30;
    return 0.15;
  }
}

class FrozenProduct extends BaseProduct {
  getShelfLife(): number { return 30; }
  getStorageRequirements(): string { return "Freezer"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'low'; }

  getPricingStrategy() {
    return { discountFactor: 0.10, urgencyMultiplier: 1.3 };
  }

  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 7) return 0.15;
    if (daysToExpiry <= 14) return 0.10;
    return 0.05;
  }
}

class BeverageProduct extends BaseProduct {
  getShelfLife(): number { return 60; }
  getStorageRequirements(): string { return "Cool & Dry"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'low'; }

  getPricingStrategy() {
    return { discountFactor: 0.08, urgencyMultiplier: 1.2 };
  }

  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 14) return 0.12;
    if (daysToExpiry <= 30) return 0.08;
    return 0.03;
  }
}

// 🏭 TRUE Factory Pattern - Creates different product types
class ProductFactory {
  static createProduct(name: string, category: string, basePrice: number, stock: number): BaseProduct {
    switch (category) {
      case "Dairy":
        return new DairyProduct(name, category, basePrice, stock);

      case "Produce":
        return new ProduceProduct(name, category, basePrice, stock);

      case "Meat":
        return new MeatProduct(name, category, basePrice, stock);

      case "Bakery":
        return new BakeryProduct(name, category, basePrice, stock);

      case "Frozen":
        return new FrozenProduct(name, category, basePrice, stock);

      case "Beverages":
        return new BeverageProduct(name, category, basePrice, stock);

      default:
        // Fallback to Dairy as default
        console.warn(`Unknown category "${category}", defaulting to Dairy`);
        return new DairyProduct(name, category, basePrice, stock);
    }
  }

  // Factory method for creating product data for API
  static createProductData(name: string, category: string, basePrice: number, stock: number) {
    const product = this.createProduct(name, category, basePrice, stock);
    return product.getProductData();
  }
}

const AddProduct: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    mrp: '',
    stock: '',
    mfgDate: '',
    expiryDate: '',
    mlProductId: '' // 👈 new: ML dataset product id
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categories = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Frozen', 'Beverages'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const calculateShelfLife = () => {
    if (formData.mfgDate && formData.expiryDate) {
      const mfg = new Date(formData.mfgDate);
      const exp = new Date(formData.expiryDate);
      const days = Math.floor((exp.getTime() - mfg.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    }
    return null;
  };

  const shelfLife = calculateShelfLife();

  // 🏭 Demonstrate Factory Pattern: Get product-specific insights
  const getProductInsights = () => {
    if (!formData.name || !formData.category) return null;

    try {
      const mrpNum = parseFloat(formData.mrp) || 0;
      const stockNum = Number(formData.stock) || 0;

      const product = ProductFactory.createProduct(
        formData.name.trim(),
        formData.category,
        mrpNum,
        stockNum
      );

      const expiryDate = formData.expiryDate ? new Date(formData.expiryDate) : new Date();
      const daysToExpiry = product.getDaysToExpiry(expiryDate);
      const optimalDiscount = product.getOptimalDiscount(daysToExpiry);

      return {
        shelfLife: product.getShelfLife(),
        storage: product.getStorageRequirements(),
        spoilageRisk: product.getSpoilageRisk(),
        pricingStrategy: product.getPricingStrategy(),
        daysToExpiry,
        optimalDiscount: (optimalDiscount * 100).toFixed(1),
        recommendedPrice: (mrpNum * (1 - optimalDiscount)).toFixed(2)
      };
    } catch (error) {
      console.error('Error creating product insights:', error);
      return null;
    }
  };

  const productInsights = getProductInsights();

  const validateForm = () => {
    if (!formData.name.trim()) return 'Product name is required';
    if (!formData.category) return 'Category is required';
    if (!formData.mrp || Number(formData.mrp) <= 0) return 'Valid MRP is required';
    if (!formData.stock || Number(formData.stock) < 0) return 'Valid stock quantity is required';
    if (!formData.mfgDate) return 'Manufacturing date is required';
    if (!formData.expiryDate) return 'Expiry date is required';
    if (new Date(formData.expiryDate) <= new Date(formData.mfgDate)) return 'Expiry date must be after manufacturing date';
    if (!formData.mlProductId.trim()) return 'ML Product ID (from the model dataset) is required';
    return null;
  };

  const extractErrorMessage = (err: any) => {
    if (err?.response?.data) {
      const data = err.response.data;
      if (data.message) return data.message;
      if (data.error || data.errors) {
        if (typeof data.error === 'string') return data.error;
        if (Array.isArray(data.errors)) return data.errors.join(', ');
        return JSON.stringify(data.error || data.errors);
      }
    }
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    if (typeof err === 'string') return err;
    return 'Failed to add product';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      const mrpNum = parseFloat(formData.mrp);
      const stockNum = Number(formData.stock);

      // 🏭 Use TRUE Factory Pattern to create product with category-specific behavior
      const factoryData = ProductFactory.createProductData(
        formData.name.trim(),
        formData.category,
        mrpNum,
        stockNum
      );

      const payload: any = {
        ...factoryData,
        description: '',

        pricing: {
          costPrice: Number((mrpNum * 0.4).toFixed(2)),
          mrp: mrpNum,
          currentPrice: mrpNum
        },

        stock: {
          quantity: stockNum,
          unit: 'units',
          reorderLevel: 0
        },

        perishable: {
          manufactureDate: new Date(formData.mfgDate).toISOString(),
          expiryDate: new Date(formData.expiryDate).toISOString()
        },

        //  send ML dataset product id to backend for storage
        aiMetrics: {
          mlProductId: formData.mlProductId.trim()
        },
        sales: {}
      };

      let res;
      if (imageFile) {
        res = await addProduct(payload, { useFormData: true, imageFile });
      } else {
        res = await addProduct(payload);
      }

      setSuccessMessage(res?.message ?? 'Product added successfully!');
      setFormData({
        name: '',
        category: '',
        mrp: '',
        stock: '',
        mfgDate: '',
        expiryDate: '',
        mlProductId: ''
      });
      setImagePreview(null);
      setImageFile(null);

    } catch (err: any) {
      console.error('Add product failed ->', err);
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
            <Package className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-gray-800 mb-1">Add New Product</h1>
            <p className="text-gray-600">Add perishable items to your inventory</p>
          </div>
        </div>
      </motion.div>

      {successMessage && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
          <Alert message={successMessage} type="success" onClose={() => setSuccessMessage('')} />
        </motion.div>
      )}
      {errorMessage && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
          <Alert message={errorMessage} type="error" onClose={() => setErrorMessage('')} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Info className="text-blue-600" size={20} />
                <h2 className="text-gray-800">Basic Information</h2>
              </div>

              <div className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Product Image</label>
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="text-gray-400 mb-2" size={32} />
                        <p className="text-sm text-gray-600">Click to upload product image</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div className="relative">
                      <img src={imagePreview} alt="Product preview" className="w-full h-32 object-cover rounded-lg" />
                      <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Product Name *</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Fresh Organic Milk"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Category *</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {/* 🏭 Factory Pattern Demo: Product Insights */}
                {productInsights && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="text-blue-600" size={20} />
                      <h3 className="font-semibold text-blue-800">🏭 Factory Pattern: Product Intelligence</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Shelf Life</div>
                        <div className="font-semibold text-lg">{productInsights.shelfLife} days</div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Storage</div>
                        <div className="font-semibold text-sm">{productInsights.storage}</div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Spoilage Risk</div>
                        <div className={`font-semibold px-2 py-1 rounded text-xs inline-block ${
                          productInsights.spoilageRisk === 'high' ? 'bg-red-100 text-red-800' :
                          productInsights.spoilageRisk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {productInsights.spoilageRisk.toUpperCase()}
                        </div>
                      </div>

                      {/* <div className="bg-white p-3 rounded-lg border">
                        <div className="text-gray-600">Optimal Discount</div>
                        <div className="font-semibold text-lg text-green-600">
                          {productInsights.optimalDiscount}%
                        </div>
                        <div className="text-xs text-gray-500">
                          ${productInsights.recommendedPrice} price
                        </div>
                      </div> */}
                    </div>

                    {/* <div className="mt-3 text-xs text-gray-600">
                      <strong>Factory Pattern Benefit:</strong> Each product category gets its own class with specialized behavior,
                      pricing strategies, and spoilage calculations - not just different property values!
                    </div> */}
                  </motion.div>
                )}

                {/* ML Product ID */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    ML Product ID (from your model dataset) *
                  </label>
                  <input
                    type="text"
                    name="mlProductId"
                    value={formData.mlProductId}
                    onChange={handleChange}
                    placeholder="e.g., P-00123"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This must match the productId used in your ML training data so the optimizer can price it correctly.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <DollarSign className="text-green-600" size={20} />
                <h2 className="text-gray-800">Pricing & Stock</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Price (MRP) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      step="0.01"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Stock Quantity *</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      placeholder="0"
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dates & Expiry */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="text-orange-600" size={20} />
                <h2 className="text-gray-800">Dates & Expiry</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Manufacturing Date *</label>
                  <input
                    type="date"
                    name="mfgDate"
                    value={formData.mfgDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Expiry Date *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {shelfLife !== null && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Info className="text-blue-600" size={16} />
                    <p className="text-sm text-blue-800">
                      Shelf Life: <span className="font-semibold">{shelfLife} days</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Adding Product...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Add Product
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    name: '',
                    category: '',
                    mrp: '',
                    stock: '',
                    mfgDate: '',
                    expiryDate: '',
                    mlProductId: ''
                  });
                  setImagePreview(null);
                  setImageFile(null);
                  setSuccessMessage('');
                  setErrorMessage('');
                }}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Form
              </button>
            </div>
          </form>
        </motion.div>

        {/* Sidebar - Preview & Info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          {/* Product Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-gray-800 mb-4">Product Preview</h3>

            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
              {imagePreview ? <img src={imagePreview} alt="Product" className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" size={48} />}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Product Name</p>
                <p className="text-gray-800">{formData.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-gray-800">{formData.category || 'Not set'}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-gray-800">${formData.mrp || '0.00'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Stock</p>
                  <p className="text-gray-800">{formData.stock || '0'} units</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">ML Product ID</p>
                <p className="text-gray-800">{formData.mlProductId || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Info className="text-white" size={14} />
              </div>
              <h3 className="text-gray-800">Quick Tips</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <span>Use clear, descriptive product names</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <span>Select the correct category for better organization</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <span>Always verify expiry dates for accuracy</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <span>
                  Make sure <span className="font-semibold">ML Product ID</span> exactly matches the ID in your ML dataset.
                </span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AddProduct;
