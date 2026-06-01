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
  algorithmComparison?: {
    xgboost?: {
      accuracy?: number;
      wasteSavedValue?: number;
      netProfit?: number;
    };
    randomForest?: {
      accuracy?: number;
      wasteSavedValue?: number;
      netProfit?: number;
    };
    xgboostAdvantage?: {
      extraWasteSaved?: number;
      extraProfit?: number;
    };
  };
  reorderRecommendation?: {
    status?: 'URGENT_REORDER' | 'WARNING' | 'OK';
    reorderDate?: string | null;
    daysUntilStockout?: number | null;
    recommendedQuantity?: number;
    reasoning?: string;
  };
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
                <label className="block text-sm text-gray-700 mb-2">Current Price (?)</label>
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
          {result?.reorderRecommendation && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-xl border flex items-start gap-4 ${
                result.reorderRecommendation.status === 'URGENT_REORDER' 
                  ? 'bg-red-50 border-red-200' 
                  : result.reorderRecommendation.status === 'WARNING'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                result.reorderRecommendation.status === 'URGENT_REORDER' ? 'bg-red-100' : result.reorderRecommendation.status === 'WARNING' ? 'bg-amber-100' : 'bg-green-100'
              }`}>
                <Package className={
                  result.reorderRecommendation.status === 'URGENT_REORDER' ? 'text-red-600' : result.reorderRecommendation.status === 'WARNING' ? 'text-amber-600' : 'text-green-600'
                } size={24} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  result.reorderRecommendation.status === 'URGENT_REORDER' ? 'text-red-800' : result.reorderRecommendation.status === 'WARNING' ? 'text-amber-800' : 'text-green-800'
                }`}>
                  Inventory Intelligence: {
                    result.reorderRecommendation.status === 'URGENT_REORDER' ? 'Immediate Reorder Required' 
                    : result.reorderRecommendation.status === 'WARNING' ? 'Reorder Soon' 
                    : 'Stock is Sufficient'
                  }
                </h3>
                <p className="text-gray-700 mt-1">{result.reorderRecommendation.reasoning}</p>
                {result.reorderRecommendation.status !== 'OK' && (
                  <div className="flex gap-4 mt-3">
                    <div className="bg-white/60 px-3 py-1.5 rounded-md border border-black/5 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-500" />
                      <span className="text-sm font-medium text-gray-800">Order By: {result.reorderRecommendation.reorderDate}</span>
                    </div>
                    <div className="bg-white/60 px-3 py-1.5 rounded-md border border-black/5 flex items-center gap-2">
                      <Package size={14} className="text-gray-500" />
                      <span className="text-sm font-medium text-gray-800">Rec. Qty: {result.reorderRecommendation.recommendedQuantity} units</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

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
                        ?
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

              {/* NEW: Algorithm Comparison Section */}
              {result.algorithmComparison && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <BarChart3 className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-gray-800">Algorithm Performance Comparison</h3>
                      <p className="text-sm text-gray-500">Proving the superiority of XGBoost over a Baseline (Random Forest)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* XGBoost Column */}
                    <div className="border border-green-200 bg-green-50/50 rounded-xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">WINNER</div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Sparkles className="text-green-600" size={16} /> XGBoost Model
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Model Accuracy:</span>
                          <span className="font-medium text-gray-800">{result.algorithmComparison.xgboost?.accuracy?.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Waste Saved:</span>
                          <span className="font-medium text-green-600">${result.algorithmComparison.xgboost?.wasteSavedValue?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-green-200 pt-2">
                          <span className="text-sm text-gray-600">Optimized Net Profit:</span>
                          <span className="font-semibold text-gray-800">${result.algorithmComparison.xgboost?.netProfit?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Random Forest Column */}
                    <div className="border border-gray-200 bg-gray-50 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-800 mb-3">Baseline (Random Forest)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Model Accuracy:</span>
                          <span className="font-medium text-gray-800">{result.algorithmComparison.randomForest?.accuracy?.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Waste Saved:</span>
                          <span className="font-medium text-amber-600">${result.algorithmComparison.randomForest?.wasteSavedValue?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                          <span className="text-sm text-gray-600">Optimized Net Profit:</span>
                          <span className="font-semibold text-gray-800">${result.algorithmComparison.randomForest?.netProfit?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg text-center">
                    <p className="text-gray-800 font-medium">
                       By using XGBoost, we save an <span className="text-indigo-600 font-bold text-lg">additional ${result.algorithmComparison.xgboostAdvantage?.extraWasteSaved?.toFixed(2)}</span> in waste 
                      and generate <span className="text-green-600 font-bold">${result.algorithmComparison.xgboostAdvantage?.extraProfit?.toFixed(2)} more profit</span> compared to the Random Forest baseline!
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PricePredictor;
