// src/pages/Inventory.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Download, Upload,
  Edit, Trash2, TrendingUp, Clock,
  CheckCircle, Sparkles, Package, Eye, Zap,
  AlertTriangle
} from 'lucide-react';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import * as productService from '../services/productService';

type ProductItem = {
  _id?: string;
  id?: number | string;
  name: string;
  category: string;
  expiryDate: string;
  currentPrice: number;
  originalPrice?: number;
  stock: number;
  // Keep backend status if you want, but UI "status" badges are derived from expiryDate.
  status: string;
  confidence?: number;
  pricing?: { currentPrice?: number; mrp?: number; costPrice?: number };
  aiMlProductId?: string;
  mlPrice?: number | null;
  optimalPrice?: number | null;
};

const DEFAULT_LOCAL_PRODUCTS: ProductItem[] = [
  { id: 1, name: 'Fresh Milk (1L)', category: 'Dairy', expiryDate: '2024-11-08', currentPrice: 3.99, originalPrice: 4.99, mlPrice: null, stock: 50, status: 'critical', confidence: 94 },
  { id: 2, name: 'Greek Yogurt', category: 'Dairy', expiryDate: '2024-11-09', currentPrice: 4.99, originalPrice: 5.99, mlPrice: null, stock: 30, status: 'warning', confidence: 91 },
  { id: 3, name: 'Chicken Breast', category: 'Meat', expiryDate: '2024-11-10', currentPrice: 8.99, originalPrice: 10.99, mlPrice: null, stock: 25, status: 'warning', confidence: 88 },
  { id: 4, name: 'Fresh Bread', category: 'Bakery', expiryDate: '2024-11-15', currentPrice: 2.99, originalPrice: 2.99, mlPrice: null, stock: 100, status: 'good', confidence: 92 },
  { id: 5, name: 'Bananas', category: 'Produce', expiryDate: '2024-11-12', currentPrice: 1.99, originalPrice: 2.49, mlPrice: null, stock: 75, status: 'good', confidence: 89 }
];

const FLASK_BASE = (import.meta as any)?.env?.VITE_ML_API_URL || 'http://localhost:8000/predict';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_LOCAL_PRODUCTS);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', currentPrice: 0, stock: 0 });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [busyIds, setBusyIds] = useState<(string | number)[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // ML flow state
  const [optimizing, setOptimizing] = useState<string | number | null>(null);
  const [mlResponse, setMlResponse] = useState<any>(null);
  const [showMlModal, setShowMlModal] = useState(false);

  const categories = ['all', 'Dairy', 'Meat', 'Produce', 'Bakery', 'Frozen', 'Beverages'];
  // UI state pattern derived from expiry:
  // fresh -> expiring -> expired
  const statuses = ['all', 'fresh', 'expiring', 'expired'];

  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      setLoadingList(true);
      try {
        const resp = await productService.listProducts({ limit: 200 });
        if (!mounted) return;

        if (resp && Array.isArray(resp.products)) {
          const normalized: ProductItem[] = resp.products.map((p: any, idx: number) => ({
            _id: p._id || p.id || undefined,
            id: p._id || p.id || String(idx + 1),
            name: p.name || p.sku || 'Unnamed product',
            category: p.category || 'Uncategorized',
            expiryDate: (p.perishable?.expiryDate)
              ? new Date(p.perishable.expiryDate).toISOString().slice(0, 10)
              : (p.expiryDate || ''),
            currentPrice: Number(p.pricing?.currentPrice ?? p.currentPrice ?? 0),
            originalPrice: Number(p.pricing?.mrp ?? p.originalPrice ?? 0),
            stock: Number(p.stock?.quantity ?? p.stock ?? 0),
            status: p.status ?? 'active',
            confidence: p.aiMetrics?.confidenceScore ?? p.confidence ?? 0,
            aiMlProductId: p.aiMetrics?.mlProductId ?? p.aiMlProductId ?? '',
            mlPrice: p.aiMetrics?.recommendedPrice ?? p.mlPrice ?? null,
            optimalPrice: p.aiMetrics?.optimalPrice ?? null,
            pricing: p.pricing ?? undefined
          }));

          // If backend uses "discontinued" as soft-delete, filter those out for the UI list
          const visible = normalized.filter(x => (x.status ?? '').toString().toLowerCase() !== 'discontinued');
          setProducts(visible);
        }
      } catch (err) {
        console.warn('Failed to fetch products, using local defaults', err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, []);

  const calcDaysToExpiry = (expiryDate: string) => {
    if (!expiryDate) return 0;
    const ms = new Date(expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / MS_PER_DAY));
  };

  const isExpiringSoon = (expiryDate: string) => calcDaysToExpiry(expiryDate) <= 3;

  const getExpiryState = (expiryDate: string): 'fresh' | 'expiring' | 'expired' => {
    const daysLeft = calcDaysToExpiry(expiryDate);
    if (daysLeft === 0) return 'expired';
    if (daysLeft <= 3) return 'expiring';
    return 'fresh';
  };

  const filteredProducts = products.filter(product => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      (product.aiMlProductId ?? '').toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'all' || getExpiryState(product.expiryDate) === (selectedStatus as any);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const optimisticUpdateLocal = (id: string | number, patch: Partial<ProductItem>) => {
    setProducts(prev => prev.map(p => (p._id === id || p.id === id ? { ...p, ...patch } : p)));
  };

  const handleOpenEditModal = (product: ProductItem) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      currentPrice: product.currentPrice ?? 0,
      stock: product.stock ?? 0
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;
    const id = selectedProduct._id ?? selectedProduct.id;
    if (!id) return;

    setActionLoading(true);
    setErrorMessage('');

    try {
      const updatePayload: any = {
        name: editForm.name,
        pricing: {
          currentPrice: Number(editForm.currentPrice),
          mrp: selectedProduct.originalPrice ?? Number(editForm.currentPrice),
          costPrice: selectedProduct.originalPrice ?? Number(editForm.currentPrice)
        },
        stock: {
          quantity: Number(editForm.stock),
          unit: 'units',
          reorderLevel: 10
        }
      };

      await productService.updateProduct(String(id), updatePayload);

      optimisticUpdateLocal(id, {
        name: editForm.name,
        currentPrice: Number(editForm.currentPrice),
        stock: Number(editForm.stock)
      });

      setSuccessMessage(`${editForm.name} updated successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsEditModalOpen(false);
    } catch (err: any) {
      const errorMsg = typeof err === 'string'
        ? err
        : (err?.response?.data?.message ?? err?.message ?? 'Failed to update product');
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // open delete modal and set the selected product
  const openDeleteModalFor = (product: ProductItem) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  // IMPORTANT: using force: true to request a permanent delete from server (backend supports ?force=true)
  const handleDeleteProduct = async () => {
    if (!selectedProduct) {
      setErrorMessage('No product selected to delete');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const mongoId = selectedProduct._id ?? selectedProduct.id;
    if (!mongoId) {
      setErrorMessage('Product id missing');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setActionLoading(true);
    setErrorMessage('');

    try {
      // call delete with force:true so backend performs hard delete
      const res = await productService.deleteProduct(String(mongoId), { force: true });
      console.log('DELETE response:', res);

      // Remove locally after successful server response
      setProducts(prev => prev.filter(p => (p._id !== mongoId && p.id !== mongoId)));
      setSuccessMessage(`${selectedProduct.name} deleted permanently`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      const errorMsg = typeof err === 'string'
        ? err
        : (err?.response?.data?.message ?? err?.message ?? 'Failed to delete product');
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const extractOptimalPrice = (res: any): number | null => {
    const v = res?.recommendations?.optimalPrice;
    return (typeof v === 'number' && !Number.isNaN(v)) ? v : null;
  };

  const handleOptimizeProduct = async (product: ProductItem) => {
    const id = product._id ?? product.id;
    if (!id) return;

    if (!product.aiMlProductId) {
      setErrorMessage(`Add ML Product ID for "${product.name}" before optimizing.`);
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setOptimizing(id);
    setErrorMessage('');

    try {
      const payload = {
        productId: product.aiMlProductId,
        stockLevel: Number(product.stock ?? 0),
        daysToExpiry: calcDaysToExpiry(product.expiryDate),
      };

      const resp = await fetch(`${FLASK_BASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || `ML /predict failed with ${resp.status}`);
      }

      const data = await resp.json();
      const optimalPrice = extractOptimalPrice(data);
      if (optimalPrice == null) {
        throw new Error('ML response missing recommendations.optimalPrice');
      }

      await productService.updateProduct(String(id), {
        pricing: {
          currentPrice: Number(optimalPrice),
          mrp: product.originalPrice ?? Number(optimalPrice),
          costPrice: product.originalPrice ?? Number(optimalPrice)
        },
        aiMetrics: {
          mlProductId: product.aiMlProductId,
          optimalPrice: Number(optimalPrice),
          recommendedPrice: Number(optimalPrice),
          confidenceScore: Number(data?.recommendations?.confidenceScore ?? product.confidence ?? 0)
        }
      });

      optimisticUpdateLocal(id, {
        currentPrice: Number(optimalPrice),
        mlPrice: Number(optimalPrice),
        optimalPrice: Number(optimalPrice),
        confidence: Number(data?.recommendations?.confidenceScore ?? product.confidence ?? 0),
        pricing: { ...(product.pricing || {}), currentPrice: Number(optimalPrice) }
      });

      setMlResponse({
        oldPrice: product.currentPrice,
        newPrice: Number(optimalPrice),
        optimalPrice: Number(optimalPrice),
        mlData: data
      });
      setShowMlModal(true);
      setSuccessMessage(`Optimized price for ${product.name}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMsg = typeof err === 'string'
        ? err
        : (err?.message ?? 'ML optimization failed');
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setOptimizing(null);
    }
  };

  const handleBatchOptimize = async () => {
    if (selectedItems.length === 0) return;

    const ids = selectedItems.slice();
    setBusyIds(prev => [...prev, ...ids]);

    try {
      const results = await Promise.allSettled(
        ids.map(async (idOrNum) => {
          const p = products.find(pp => pp._id === idOrNum || pp.id === idOrNum);
          if (!p) throw new Error('Product not found in table');
          if (!p.aiMlProductId) throw new Error(`"${p?.name ?? 'Product'}" missing ML Product ID`);

          const payload = {
            productId: p.aiMlProductId,
            stockLevel: Number(p.stock ?? 0),
            daysToExpiry: calcDaysToExpiry(p.expiryDate),
            currentPrice: Number(p.currentPrice ?? 0)
          };

          const resp = await fetch(`${FLASK_BASE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error(`ML /predict failed (${resp.status})`);
          const data = await resp.json();
          const optimal = extractOptimalPrice(data);
          if (optimal == null) throw new Error('ML response missing recommendations.optimalPrice');

          await productService.updateProduct(String(idOrNum), {
            pricing: {
              currentPrice: Number(optimal),
              mrp: p.originalPrice ?? Number(optimal),
              costPrice: p.originalPrice ?? Number(optimal)
            },
            aiMetrics: {
              mlProductId: p.aiMlProductId,
              optimalPrice: Number(optimal),
              recommendedPrice: Number(optimal),
              confidenceScore: Number(data?.recommendations?.confidenceScore ?? p.confidence ?? 0)
            }
          });

          optimisticUpdateLocal(String(idOrNum), {
            currentPrice: Number(optimal),
            mlPrice: Number(optimal),
            optimalPrice: Number(optimal),
            confidence: Number(data?.recommendations?.confidenceScore ?? p.confidence ?? 0)
          });
        })
      );

      const ok = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - ok;

      if (ok) setSuccessMessage(`${ok} product(s) optimized`);
      if (failed) setErrorMessage(`${failed} failed (check ML Product IDs / expiry)`);
      setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 4000);
      setSelectedItems([]);
    } finally {
      setBusyIds(prev => prev.filter(x => !ids.includes(x)));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredProducts.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredProducts.map(p => p._id ?? p.id ?? ''));
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      fresh: { bg: 'bg-green-100', text: 'text-green-700', label: 'Fresh' },
      expiring: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Expiring' },
      expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expired' }
    };
    const badge = badges[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: status || 'Unknown' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // ---- Updated stats logic ----
  const stats = (() => {
    const total = products.length;

    // critical = number of items expiring soon (red expiry)
    const critical = products.filter(p => isExpiringSoon(p.expiryDate)).length;

    // needsOptimization = items where the ML optimal price is missing (null/undefined)
    const needsOptimization = products.filter(p => {
      const mlOpt = (typeof p.optimalPrice === 'number' ? p.optimalPrice :
                     typeof p.mlPrice === 'number' ? p.mlPrice : null);
      // only count when ML optimal is absent (displayed as '—' in UI)
      return mlOpt === null;
    }).length;

    const totalValue = products.reduce((sum, p) => sum + ((p.currentPrice ?? 0) * (p.stock ?? 0)), 0);

    return { total, critical, needsOptimization, totalValue };
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage and optimize your perishable products</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <Download size={18} /> Export
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload size={18} /> Import
          </motion.button>
        </div>
      </div>

      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert message={successMessage} type="success" onClose={() => setSuccessMessage('')} />
        </motion.div>
      )}
      {errorMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert message={errorMessage} type="error" onClose={() => setErrorMessage('')} />
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Items</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <Clock className="text-red-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Optimization</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.needsOptimization}</p>
            </div>
            <Sparkles className="text-yellow-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">${Math.round(stats.totalValue)}</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter size={18} /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4"
            >
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Batch Actions */}
      {selectedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-blue-900">
            {selectedItems.length} item(s) selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBatchOptimize}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Sparkles size={16} /> Optimize Prices
            </button>
            <button
              type="button"
              onClick={() => setSelectedItems([])}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Current Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ML Optimal</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product, index) => {
                const idKey = product._id ?? product.id!;
                const calculating = busyIds.includes(idKey);
                const isThisOptimizing = optimizing === idKey;
                const hasMlId = !!product.aiMlProductId;

                const mlOptimalToShow =
                  (typeof product.optimalPrice === 'number' ? product.optimalPrice :
                   typeof product.mlPrice === 'number' ? product.mlPrice : null);

                const needsApply =
                  typeof mlOptimalToShow === 'number' &&
                  Math.abs((product.currentPrice ?? 0) - mlOptimalToShow) > 0.001;

                return (
                  <motion.tr
                    key={String(idKey) || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(idKey)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedItems(prev => [...prev, idKey]);
                          else setSelectedItems(prev => prev.filter(x => x !== idKey));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <Package size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">ID: {String(idKey)}</div>
                          <div className="text-xs text-gray-400">
                            ML ID: {product.aiMlProductId ? product.aiMlProductId : '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${isExpiringSoon(product.expiryDate) ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.expiryDate}
                      </div>
                      {(() => {
                        const daysLeft = calcDaysToExpiry(product.expiryDate);
                        if (daysLeft === 0) {
                          return (
                            <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                              <Clock size={12} /> Expired
                            </div>
                          );
                        }
                        if (daysLeft <= 3) {
                          return (
                            <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                              <Clock size={12} /> Expires soon
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(getExpiryState(product.expiryDate))}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        ${(product.currentPrice ?? 0).toFixed(2)}
                        {(calculating || isThisOptimizing) && <span className="ml-2 text-xs text-gray-500">Updating...</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className={`text-sm font-bold ${needsApply ? 'text-green-600' : 'text-gray-900'}`}>
                          {typeof mlOptimalToShow === 'number' ? `$${mlOptimalToShow.toFixed(2)}` : '—'}
                        </div>
                        {typeof product.confidence === 'number' && (
                          <div className="text-xs text-gray-500">{product.confidence}% confidence</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{product.stock} units</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/product/${idKey}`}>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="View Details"
                            aria-label={`View ${product.name}`}
                          >
                            <Eye size={16} />
                          </motion.button>
                        </Link>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleOpenEditModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit Product"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit size={16} />
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: hasMlId ? 1.1 : 1.0 }}
                          whileTap={{ scale: hasMlId ? 0.9 : 1.0 }}
                          onClick={() => hasMlId ? handleOptimizeProduct(product) : undefined}
                          className={`p-2 rounded-lg ${hasMlId ? 'text-green-700 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed'}`}
                          title={hasMlId ? (isThisOptimizing ? 'Optimizing...' : 'AI Optimize & Apply') : 'Add ML Product ID to enable optimization'}
                          disabled={!!optimizing || !hasMlId}
                          aria-label={hasMlId ? `Optimize ${product.name}` : `Missing ML ID for ${product.name}`}
                        >
                          {isThisOptimizing
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mx-auto" />
                            : <Zap size={16} />}
                        </motion.button>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openDeleteModalFor(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete Product"
                          aria-label={`Delete ${product.name}`}
                          disabled={actionLoading}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(!loadingList && filteredProducts.length === 0) && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No products found</p>
          </div>
        )}

        {loadingList && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product"
      >
        {selectedProduct && (
          <div className="space-y-5">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Package size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600">{selectedProduct.category}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedProduct.status === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : selectedProduct.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {selectedProduct.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
                  <p className="text-gray-600 text-xs mb-1">Current Price</p>
                  <p className="text-lg font-bold text-gray-900">${(selectedProduct.currentPrice ?? 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-green-100">
                  <p className="text-gray-600 text-xs mb-1">ML Optimal</p>
                  <p className="text-lg font-bold text-green-600">
                    {typeof selectedProduct.optimalPrice === 'number'
                      ? `$${selectedProduct.optimalPrice.toFixed(2)}`
                      : (typeof selectedProduct.mlPrice === 'number' ? `$${selectedProduct.mlPrice.toFixed(2)}` : '—')}
                  </p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
                  <p className="text-gray-600 text-xs mb-1">Current Stock</p>
                  <p className="text-lg font-bold text-purple-600">{selectedProduct.stock}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Selling Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.currentPrice}
                    onChange={(e) => setEditForm(prev => ({ ...prev, currentPrice: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold transition-all"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    units
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                    <p className="font-medium mb-1">Expiry Date: {selectedProduct.expiryDate}</p>
                    <p>Make sure pricing and stock levels are accurate before saving.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleUpdateProduct}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={actionLoading || !editForm.name.trim()}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Updating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle size={18} /> Save Changes
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditModalOpen(false)}
                disabled={actionLoading}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Product"
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle size={28} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-lg mb-2">Confirm Deletion</h4>
                  <p className="text-red-800 text-sm leading-relaxed">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-bold">{selectedProduct.name}</span>?
                  </p>
                  <p className="text-red-700 text-sm mt-2 leading-relaxed">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Category</p>
                  <p className="font-semibold text-gray-900">{selectedProduct.category}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Current Stock</p>
                  <p className="font-semibold text-gray-900">{selectedProduct.stock} units</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Current Price</p>
                  <p className="font-semibold text-gray-900">${selectedProduct.currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Expiry Date</p>
                  <p className="font-semibold text-gray-900">{selectedProduct.expiryDate}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteProduct}
                className="flex-1"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Trash2 size={18} /> Delete Product
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={actionLoading}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ML Optimization Result Modal */}
      <Modal
        isOpen={showMlModal}
        onClose={() => setShowMlModal(false)}
        title="AI Pricing Optimization Result"
      >
        {mlResponse && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-300">
              <h3 className="font-semibold text-lg text-gray-800">
                Optimal Price from ML: ${Number(mlResponse?.optimalPrice ?? 0).toFixed(2)}
              </h3>
              <p className="text-sm text-gray-600">
                Old Price: ${Number(mlResponse?.oldPrice ?? 0).toFixed(2)}
              </p>
              {typeof mlResponse?.mlData?.recommendations?.confidenceScore === 'number' && (
                <p className="text-sm text-gray-600">
                  Confidence: {mlResponse.mlData.recommendations.confidenceScore}%
                </p>
              )}
            </div>

            {Array.isArray(mlResponse?.mlData?.forecast) && mlResponse.mlData.forecast.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-gray-800 font-medium">5-Day Forecast (from model)</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {mlResponse.mlData.forecast.map((f: any) => (
                    <li key={f.day}>
                      Day {f.day}: expectedSales {Number(f.expectedSales ?? 0).toFixed(2)} @ ${Number(f.recommendedPrice ?? 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mlResponse?.mlData?.impact && (
              <div className="space-y-2">
                <h4 className="text-gray-800 font-medium">Estimated Impact</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>💰 Profit Increase: ${Number(mlResponse.mlData.impact.profitIncrease ?? 0).toFixed(2)}</li>
                  <li>💵 Revenue Change: ${Number(mlResponse.mlData.impact.revenueChange ?? 0).toFixed(2)}</li>
                  <li>📈 Sell-through Rate: {Number(mlResponse.mlData.impact.sellThroughRate ?? 0).toFixed(2)}%</li>
                  <li>🗑 Waste Reduction: {Number(mlResponse.mlData.impact.wasteReduction ?? 0).toFixed(2)}%</li>
                </ul>
              </div>
            )}

            {mlResponse?.mlData?.scenarios?.optimal && (
              <div className="text-sm text-gray-700">
                <p>
                  Scenario Optimal Price: ${Number(mlResponse.mlData.scenarios.optimal.price ?? 0).toFixed(2)}
                </p>
                <p>
                  Expected Sales: {Number(mlResponse.mlData.scenarios.optimal.expectedSales ?? 0).toFixed(2)} units
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setShowMlModal(false)} variant="primary">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;
