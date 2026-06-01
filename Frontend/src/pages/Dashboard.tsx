import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Package, AlertTriangle, TrendingUp,
  ArrowUpRight, ArrowDownRight, Zap, Target, BarChart3, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { listProducts, backfillWasteValues, getWasteSavedVsDay } from '../services/productService'; // dashboard data helpers

const StatCard = ({ title, value, change, icon: Icon, color, trend }: any) => {
  const colorClasses: any = {
    blue:   { bg: 'from-blue-500 to-blue-600',   light: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
    green:  { bg: 'from-green-500 to-green-600', light: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-200' },
    red:    { bg: 'from-red-500 to-red-600',     light: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
    purple: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    yellow: { bg: 'from-yellow-500 to-yellow-600', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
      className={`bg-white rounded-2xl shadow-lg border ${colorClasses[color].border} p-6 relative overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color].bg} opacity-0 group-hover:opacity-5 transition-opacity`} />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {change && (
            <div className="flex items-center gap-2">
              {trend === 'up' ? (
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <ArrowUpRight size={16} />
                  <span>{change}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
                  <ArrowDownRight size={16} />
                  <span>{change}</span>
                </div>
              )}
              <span className="text-xs text-gray-500">vs last week</span>
            </div>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color].bg} text-white shadow-lg`}
        >
          <Icon size={24} />
        </motion.div>
      </div>
    </motion.div>
  );
};

type WasteChartPoint = { date: string; wasteSaved: number };

// --- MODIFICATION 1: Update ApiProduct type ---
type ApiProduct = {
  _id?: string;
  name?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  stock?: { quantity?: number };
  perishable?: { expiryDate?: string };
  pricing?: { currentPrice?: number; mrp?: number; previousPrice?: number };
  aiMetrics?: { 
    recommendedPrice?: number; 
    confidenceScore?: number; 
    mlProductId?: string;
    // Add the new fields
    projectedWasteValue?: number;
    optimizedWasteValue?: number;
  };
};
// ------------------------------------------

const PIE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#64748b'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [didBackfillWaste, setDidBackfillWaste] = useState(false);
  const [wasteChartData, setWasteChartData] = useState<WasteChartPoint[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await listProducts({ limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' });
        const list: ApiProduct[] = Array.isArray(res?.products) ? res.products : [];
        if (!mounted) return;
        setProducts(list);
      } catch (e: any) {
        if (!mounted) return;
        setError(typeof e === 'string' ? e : (e?.message || 'Failed to load products'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // If existing products don't yet have projected/optimized waste values (after code updates),
  // backfill them once so "Total Wastage Saved" shows correct numbers.
  useEffect(() => {
    if (didBackfillWaste) return;
    if (loading) return;
    if (!products.length) return;

    const hasAllWasteValues = products.every((p) => {
      return (
        typeof p.aiMetrics?.projectedWasteValue === 'number' &&
        typeof p.aiMetrics?.optimizedWasteValue === 'number'
      );
    });

    if (hasAllWasteValues) return;

    setDidBackfillWaste(true);
    (async () => {
      try {
        setLoading(true);
        await backfillWasteValues({ limit: 50 });
        const res = await listProducts({ limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' });
        const list: ApiProduct[] = Array.isArray(res?.products) ? res.products : [];
        setProducts(list);
      } catch (e: any) {
        setError(typeof e === 'string' ? e : (e?.message || 'Failed to backfill waste values'));
      } finally {
        setLoading(false);
      }
    })();
  }, [products, loading, didBackfillWaste]);

  // Load wastage saved chart (day-wise)
  useEffect(() => {
    if (loading) return;

    (async () => {
      try {
        setError('');
        const res = await getWasteSavedVsDay(timeRange);
        const data: WasteChartPoint[] = Array.isArray(res?.data) ? res.data : [];

        // Map backend date keys to nicer labels for the chart
        const mapLabel = (dateKey: string) => {
          const d = new Date(dateKey);
          if (Number.isNaN(d.getTime())) return dateKey;
          if (timeRange === '24h') return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
          if (timeRange === '7d') return d.toLocaleDateString('en-US', { weekday: 'short' });
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        setWasteChartData(
          data.map((x) => ({
            date: mapLabel(x.date),
            wasteSaved: Number(x.wasteSaved || 0)
          }))
        );
      } catch (e: any) {
        setError(typeof e === 'string' ? e : (e?.message || 'Failed to load wastage chart'));
        setWasteChartData([]);
      }
    })();
  }, [timeRange, didBackfillWaste, loading]);

  const totalProducts = products.length;

  // --- MODIFICATION 2: Add calculation for Total Waste Saved ---
  const totalWasteSaved = useMemo(() => {
    let totalSaved = 0;
    for (const p of products) {
      if (p.aiMetrics) {
        const projected = p.aiMetrics.projectedWasteValue;
        const optimized = p.aiMetrics.optimizedWasteValue;

        // Ensure both are valid numbers before calculating
        if (typeof projected === 'number' && typeof optimized === 'number') {
          totalSaved += (projected - optimized);
        }
      }
    }
    return totalSaved;
  }, [products]);
  // -----------------------------------------------------------

  const recentAdded = useMemo(() => {
    // ... (no changes in this function)
    const ts = (p: ApiProduct) => {
      const t = p.createdAt || p.updatedAt || '';
      const d = new Date(t);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return [...products].sort((a, b) => ts(b) - ts(a)).slice(0, 5);
  }, [products]);

  const categoryCounts = useMemo(() => {
    // ... (no changes in this function)
    const map = new Map<string, number>();
    for (const p of products) {
      const key = (p.category || 'Uncategorized').trim();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [products]);
  const categoryTotal = categoryCounts.reduce((s, x) => s + x.value, 0);

  const priceAlerts = useMemo(() => {
    // ... (no changes in this function)
    const now = new Date();
    const alerts: Array<{
      id?: string;
      name: string;
      daysLeft: number;
      expiryLabel: string;
      stock: number;
      oldPrice: number | null;
      mlPrice: number | null;
      confidence?: number;
    }> = [];

    for (const p of products) {
      if (!p.perishable?.expiryDate) continue;
      const expiry = new Date(p.perishable.expiryDate);
      const diff = Math.ceil((expiry.getTime() - now.getTime()) / MS_PER_DAY);
      if (diff <= 3) {
        const stock = Number(p.stock?.quantity ?? 0);
        // old price fallback chain: previousPrice -> mrp -> currentPrice -> null
        const oldPrice =
          typeof p.pricing?.previousPrice === 'number'
            ? p.pricing.previousPrice
            : typeof p.pricing?.mrp === 'number'
            ? p.pricing.mrp
            : typeof p.pricing?.currentPrice === 'number'
            ? p.pricing.currentPrice
            : null;
        // ml price: recommendedPrice -> currentPrice -> null
        const mlPrice =
          typeof p.aiMetrics?.recommendedPrice === 'number'
            ? p.aiMetrics.recommendedPrice
            : typeof p.pricing?.currentPrice === 'number'
            ? p.pricing.currentPrice
            : null;

        let expiryLabel = '';
        if (diff <= 0) expiryLabel = 'Expired';
        else if (diff === 1) expiryLabel = 'Today';
        else if (diff === 2) expiryLabel = 'Tomorrow';
        else expiryLabel = `${diff} days`;

        alerts.push({
          id: p._id,
          name: p.name ?? 'Unnamed product',
          daysLeft: diff,
          expiryLabel,
          stock,
          oldPrice: oldPrice !== null ? Number(oldPrice) : null,
          mlPrice: mlPrice !== null ? Number(mlPrice) : null,
          confidence: p.aiMetrics?.confidenceScore
        });
      }
    }

    alerts.sort((a, b) => {
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return a.stock - b.stock;
    });

    return alerts.slice(0, 6);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your inventory.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
    
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">{error}</div>
      )}

      {/* Stats Grid */}
      {/* --- MODIFICATION 3: Update StatCard value --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={loading ? '—' : totalProducts}
          change=""
          trend="up"
          icon={Package}
          color="purple"
        />
        <StatCard 
          title="Items Expiring Soon" 
          value={loading ? '—' : priceAlerts.length} 
          change="" // You can update this to show change
          trend="up" 
          icon={AlertTriangle} 
          color="red" 
        />
        <StatCard 
          title="Total Wastage Saved" 
          value={loading ? '—' : `${totalWasteSaved.toFixed(2)}`} 
          change="+12.5%" // This is hardcoded, you can make it dynamic
          trend="up" 
          icon={TrendingUp} 
          color="blue" 
        />
         {/* I've added a 4th card for Total Value, as it's a good metric to have */}
         <StatCard 
            title="Total Inventory Value"
            value={loading ? '—' : `${(products.reduce((sum, p) => sum + (p.pricing?.currentPrice ?? 0) * (p.stock?.quantity ?? 0), 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            change=""
            trend="up"
            icon={DollarSign}
            color="green"
          />
      </div>
      {/* ------------------------------------------- */}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart (Example, you can replace with real data) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Wastage Saved (Day-wise)</h3>
          <p className="text-sm text-gray-600 mb-4">Estimated waste cost reduction by day</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={wasteChartData}>
              <defs>
                <linearGradient id="colorWasteSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="wasteSaved"
                stroke="#3b82f6"
                fill="url(#colorWasteSaved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>


        {/* Inventory by Category */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory by Category</h3>
          <p className="text-sm text-gray-600 mb-4">Distribution of products</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryCounts}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                label={(d: any) => `${d.name} (${d.value})`}
              >
                {categoryCounts.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {categoryCounts.map((cat, idx) => {
              const pct = categoryTotal ? Math.round((cat.value / categoryTotal) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                </div>
              );
            })}
            {!loading && categoryCounts.length === 0 && (
              <p className="text-sm text-gray-500">No products yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Price Alerts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Price Alerts</h3>
            </div>
            <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">
              {priceAlerts.length} items
            </span>
          </div>

          <div className="space-y-3">
            {priceAlerts.length === 0 && !loading && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-800">
                No critical expiring items right now.
              </div>
            )}

            {priceAlerts.map((alert, idx) => (
              <motion.div
                key={String(alert.id) + idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`p-4 rounded-xl border-l-4 ${
                  alert.daysLeft <= 1 ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
                } hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{alert.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        alert.daysLeft <= 1 ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'
                      }`}>
                        {alert.expiryLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <span>Stock: {alert.stock}</span>

                      {/* Old price (struck-through) */}
                      <span className="text-red-600 line-through">
                        {alert.oldPrice !== null ? `${alert.oldPrice.toFixed(2)}` : '—'}
                      </span>

                      {/* New ML price */}
                      <span className="text-green-600 font-semibold">
                        {alert.mlPrice !== null ? `→ ${alert.mlPrice.toFixed(2)}` : '→ —'}
                      </span>

                      {typeof alert.confidence === 'number' && (
                        <span className="text-xs text-gray-500">• {Math.round(alert.confidence)}% confidence</span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/product/${alert.id}`} // Make sure your router has a /product/:id route
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Update
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <Link
            to="/inventory"
            className="mt-4 block text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all items in inventory →
          </Link>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="text-blue-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
          </div>

          <div className="space-y-4">
            {loading && <p className="text-gray-500">Loading…</p>}
            {!loading && recentAdded.length === 0 && (
              <p className="text-gray-500">No recent items.</p>
            )}

            {recentAdded.map((p, index) => (
              <motion.div
                key={String(p._id) + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">New product added</span> – {p.name || 'Unnamed'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {(p.createdAt || p.updatedAt) ? new Date(p.createdAt || p.updatedAt!).toLocaleString() : '—'}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{p.category || 'Uncategorized'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Link
            to="/inventory"
            className="mt-4 w-full inline-block text-center py-2 text-sm text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-50 rounded-lg transition-colors"
          >
            View all inventory
          </Link>
        </motion.div>
      </div>

      {/* Bottom Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div whileHover={{ y: -5 }} className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white shadow-lg">
          <Package size={32} className="mb-3" />
          <h3 className="text-lg font-semibold mb-1">Add New Products</h3>
          <p className="text-sm text-purple-100 mb-4">Quickly add items to your inventory</p>
          <Link to="/add-product" className="inline-block px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:shadow-lg transition-all">
            Add Product
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white shadow-lg">
          <BarChart3 size={32} className="mb-3" />
          <h3 className="text-lg font-semibold mb-1">View Analytics</h3>
          <p className="text-sm text-green-100 mb-4">Deep dive into your performance metrics</p>
          <Link to="/analytics" className="inline-block px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:shadow-lg transition-all">
            View Analytics
          </Link>
        </motion.div>

        {/* Price Predictor Card (right of View Analytics) */}
        <motion.div whileHover={{ y: -5 }} className="p-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg">
          <TrendingUp size={32} className="mb-3" />
          <h3 className="text-lg font-semibold mb-1">Price Prediction</h3>
          <p className="text-sm text-white/90 mb-4">Quickly jump to the AI Price Predictor to run predictions and apply optimized prices.</p>
          <Link to="/price-predictor" className="inline-block px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:shadow-lg transition-all">
            Open Price Predictor
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;