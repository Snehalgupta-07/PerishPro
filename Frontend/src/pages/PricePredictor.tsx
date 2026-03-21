// src/pages/PricePredictor.tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Percent,
  CheckCircle,
  BarChart3,
  Sparkles,
  Hash
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import Button from '../components/common/Button';

type ForecastPoint = {
  day: number;
  expectedDemand?: number;
  expectedSales?: number;
  recommendedPrice: number;
};

type MlResponse = {
  algorithm?: { accuracy?: number };
  currentMetrics?: {
    currentPrice?: number;
    daysToExpiry?: number;
    stockLevel?: number;
  };
  impact?: {
    profitIncrease?: number;
    revenueChange?: number;
    sellThroughRate?: number;
    wasteReduction?: number;
  };
  recommendations?: {
    confidenceScore?: number;
    optimalPrice?: number;
    priceChangePercent?: number;
    reasoning?: string;
  };
  scenarios?: {
    optimal?: {
      price?: number;
      expectedSales?: number;
      expectedRevenue?: number;
      expectedWaste?: number;
      expectedProfit?: number;
      expectedLoss?: number;
      discountPercentage?: number;
      netProfit?: number;
    };
  };
  forecast?: ForecastPoint[];
};

const FLASK_URL =
  (import.meta as any).env?.VITE_ML_URL?.trim() || 'http://localhost:8000/predict';

const PricePredictor: React.FC = () => {
  const [formData, setFormData] = useState({
    productName: 'Fresh Organic Milk',
    category: 'Dairy',
    currentPrice: '4.99',
    stockQuantity: '150',
    daysToExpiry: '7',
    currentDemand: 'medium',
    targetProfit: '25',
    mlProductId: '38-732-7667',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<MlResponse | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const runPrediction = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const payload = {
        productId: formData.mlProductId.trim(),
        stockLevel: Number(formData.stockQuantity) || 0,
        daysToExpiry: Math.max(0, Number(formData.daysToExpiry) || 0),
      };

      const res = await fetch(FLASK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`ML API ${res.status}: ${txt || 'request failed'}`);
      }

      const data: MlResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  const optimalPrice =
    result?.recommendations?.optimalPrice ??
    result?.scenarios?.optimal?.price;

  const accuracy = result?.algorithm?.accuracy;
  const confidence = result?.recommendations?.confidenceScore;
  const priceChangePct = result?.recommendations?.priceChangePercent;
  const reasoning = result?.recommendations?.reasoning;
  const impact = result?.impact;

  // Build chart data for first 5 days
  const priceForecastData =
    (result?.forecast || [])
      .slice(0, 5)
      .map(pt => ({
        name: `Day ${pt.day}`,
        price: Number(pt.recommendedPrice || 0),
      }));

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-gray-800 mb-1">AI Price Predictor</h1>
            <p className="text-gray-600">Simulate pricing strategies and predict outcomes</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package className="text-blue-600" size={20} />
              <h2 className="text-gray-800">Product Details</h2>
            </div>

            <div className="space-y-4">
              {/* ML Product ID */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  ML Product ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="mlProductId"
                    value={formData.mlProductId}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g. 38-732-7667"
                  />
                </div>
                {/* <p className="text-xs text-gray-500 mt-1">Must match the ID used in the ML dataset.</p> */}
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Produce">Produce</option>
                  <option value="Meat">Meat</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Frozen">Frozen</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Current Price ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    name="currentPrice"
                    value={formData.currentPrice}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Days to Expiry</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    name="daysToExpiry"
                    value={formData.daysToExpiry}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* UX-only fields */}
              

              {/* <div>
                <label className="block text-sm text-gray-700 mb-2">Target Profit Margin (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    name="targetProfit"
                    value={formData.targetProfit}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div> */}
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-6">
              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                onClick={runPrediction}
                disabled={loading || !formData.mlProductId.trim()}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Running…
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Run AI Prediction
                  </>
                )}
              </Button>
            </motion.div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </motion.div>

        {/* Results Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {!result ? (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-12 flex flex-col items-center justify-center text-center min-h-[600px]">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-6 bg-white rounded-full shadow-lg mb-6"
              >
                <BarChart3 className="text-blue-600" size={64} />
              </motion.div>
              <h3 className="text-gray-800 mb-2">Ready to Optimize Pricing</h3>
              <p className="text-gray-600 max-w-md">
                Enter ML Product ID, stock, and days to expiry. We’ll fetch the optimal price straight from your ML model.
              </p>
            </div>
          ) : (
            <>
              {/* Only Optimal Scenario */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Optimal Price</p>
                      <p className="text-2xl text-gray-800">
                        ${Number(optimalPrice ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {typeof priceChangePct === 'number' && (
                    <p className="text-sm text-green-600">
                      {priceChangePct < 0 ? '↓' : '↑'} {Math.abs(priceChangePct).toFixed(2)}% vs current
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckCircle className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="text-2xl text-gray-800">
                        {typeof confidence === 'number' ? `${confidence}%` : '—'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Model accuracy: {typeof accuracy === 'number' ? `${accuracy}%` : '—'}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Projected Revenue (Optimal)</p>
                      <p className="text-2xl text-gray-800">
                        $
                        {Number(
                          result.scenarios?.optimal?.expectedRevenue ??
                            (Number(optimalPrice ?? 0) * Number(formData.stockQuantity || 0))
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Expected sales: {Number(result.scenarios?.optimal?.expectedSales ?? 0).toFixed(2)} units
                  </p>
                </div>
              </div>

              {/* NEW: Forecast chart for first 5 days (recommendedPrice) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-gray-800 mb-4">5-Day Recommended Price Forecast</h3>
                {priceForecastData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={priceForecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="price" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">No forecast data returned by the model.</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-gray-800 mb-4">Impact & Recommendation</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600">Profit Δ</p>
                    <p className="text-xl font-semibold text-green-700">
                      ${Number(impact?.profitIncrease ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600">Revenue Δ</p>
                    <p className="text-xl font-semibold text-blue-700">
                      ${Number(impact?.revenueChange ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-gray-600">Sell-through</p>
                    <p className="text-xl font-semibold text-emerald-700">
                      {Number(impact?.sellThroughRate ?? 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-xs text-gray-600">Waste ↓</p>
                    <p className="text-xl font-semibold text-amber-700">
                      {Number(impact?.wasteReduction ?? 0).toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Reasoning:</span>{' '}
                    {reasoning || 'Net Profit Optimized'}
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PricePredictor;
