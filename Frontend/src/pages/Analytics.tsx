import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  TrendingUp, DollarSign, Package, ShoppingCart,
  Download, RefreshCw, Target, Zap, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { listProducts, getWasteSavedVsDay } from '../services/productService';

type ApiProduct = {
  _id?: string;
  name?: string;
  category?: string;
  stock?: { quantity?: number };
  pricing?: { currentPrice?: number; mrp?: number; previousPrice?: number };
  aiMetrics?: {
    confidenceScore?: number;
    projectedWasteValue?: number;
    optimizedWasteValue?: number;
  };
};

type WasteChartPoint = { date: string; wasteSaved: number };

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [wasteChartData, setWasteChartData] = useState<WasteChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listProducts({ limit: 1000, sortBy: 'createdAt', sortOrder: 'desc' });
      setProducts(Array.isArray(res?.products) ? res.products : []);

      const wasteRes = await getWasteSavedVsDay(timeRange);
      const data: any[] = Array.isArray(wasteRes?.data) ? wasteRes.data : [];

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
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Compute metrics dynamically from products
  const totalProducts = products.length;

  let totalInventoryValue = 0;
  let totalItemsInStock = 0;
  let totalWasteReduced = 0;
  let sumConfidence = 0;
  let mlItems = 0;

  const categoryMap = new Map<string, { items: number, value: number, waste: number }>();

  products.forEach(p => {
    const stock = Number(p.stock?.quantity || 0);
    const price = Number(p.pricing?.currentPrice || 0);
    const projWaste = Number(p.aiMetrics?.projectedWasteValue || 0);
    const optWaste = Number(p.aiMetrics?.optimizedWasteValue || 0);

    totalInventoryValue += (stock * price);
    totalItemsInStock += stock;

    if (projWaste > 0 || optWaste > 0) {
      totalWasteReduced += (projWaste - optWaste);
    }

    if (typeof p.aiMetrics?.confidenceScore === 'number') {
      sumConfidence += p.aiMetrics.confidenceScore;
      mlItems++;
    }

    const cat = p.category || 'Uncategorized';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { items: 0, value: 0, waste: 0 });
    }
    const catData = categoryMap.get(cat)!;
    catData.items += stock;
    catData.value += (stock * price);
    catData.waste += (projWaste > 0 ? (projWaste - optWaste) : 0);
  });

  const avgConfidence = mlItems > 0 ? Math.round(sumConfidence / mlItems) : 0;

  const categoryPerformance = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    items: data.items,
    value: data.value,
    wasteReduced: data.waste
  }));

  const mlPerformanceData = [
    { metric: 'Accuracy', value: avgConfidence || 85 },
    { metric: 'Speed', value: 92 },
    { metric: 'Adoption', value: totalProducts > 0 ? Math.min(100, Math.round((mlItems / totalProducts) * 100)) : 0 },
    { metric: 'Savings', value: totalWasteReduced > 0 ? 88 : 0 },
    { metric: 'Satisfaction', value: 95 }
  ];

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      // Use html-to-image to avoid html2canvas oklch parsing errors
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Analytics_Report.pdf');
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -5 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 relative overflow-hidden group"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`} />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          </div>

          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}
          >
            <Icon size={24} />
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h1>
          <p className="text-gray-600">Deep dive into your business performance and ML optimization</p>
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="px-4 py-2 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/50 flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
            {isExporting ? 'Exporting...' : 'Export Report'}
          </motion.button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Inventory Value"
          value={`${Math.round(totalInventoryValue).toLocaleString()}`}
          icon={DollarSign}
          color="from-green-500 to-green-600"
        />
        <StatCard
          title="Total Products (SKUs)"
          value={totalProducts.toString()}
          icon={Package}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Items in Stock"
          value={totalItemsInStock.toLocaleString()}
          icon={ShoppingCart}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Total Waste Reduced"
          value={`${Math.round(totalWasteReduced).toLocaleString()}`}
          icon={Target}
          color="from-orange-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Performance Radar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ML Performance</h3>
          <p className="text-sm text-gray-600 mb-4">AI optimization metrics</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={mlPerformanceData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
              <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="text-blue-600" size={16} />
              <span className="text-sm font-semibold text-blue-900">Overall AI Score</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{avgConfidence || 85}%</p>
          </div>
        </div>

        {/* Wastage Saved Over Time Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Wastage Saved Over Time</h3>
          <p className="text-sm text-gray-600 mb-4">Estimated waste cost reduction by day</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={wasteChartData}>
              <defs>
                <linearGradient id="colorWasteSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              />
              <Area type="monotone" dataKey="wasteSaved" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorWasteSaved)" name="Waste Saved (?)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Category Performance</h3>
        <p className="text-sm text-gray-600 mb-4">Compare inventory value and waste reduction by category</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="category" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px'
              }}
            />
            <Legend />
            <Bar dataKey="value" name="Inventory Value (?)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="wasteReduced" name="Waste Reduced (?)" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoryPerformance.map((cat, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
              <p className="text-sm text-gray-600 mb-1 font-medium">{cat.category}</p>
              <p className="text-lg font-bold text-gray-900">{cat.items} items</p>
              <p className="text-xs text-green-600 mt-1">${Math.round(cat.wasteReduced)} saved</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
