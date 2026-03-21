import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, 
  AlertTriangle, Calendar, Download, RefreshCw, Target, Zap,
  ArrowUpRight, ArrowDownRight, Users, Clock
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeMetric, setActiveMetric] = useState('revenue');
  
  const revenueData = [
    { date: 'Week 1', revenue: 0, profit: 0, cost: 0, waste: 0 },
    { date: 'Week 2', revenue: 0, profit: 0, cost: 0, waste: 0 },
    { date: 'Week 3', revenue: 0, profit: 0, cost: 0, waste: 0 },
    { date: 'Week 4', revenue: 0, profit: 0, cost: 0, waste: 0 }
  ];
  
  const categoryPerformance = [
    { category: 'Dairy', revenue: 0, profit: 0, waste: 0, items: 0 },
    { category: 'Meat', revenue: 0, profit: 0, waste: 0, items: 0 },
    { category: 'Produce', revenue: 0, profit: 0, waste: 0, items: 0 },
    { category: 'Bakery', revenue: 0, profit: 0, waste: 0, items: 0 }
  ];
  
  const mlPerformanceData = [
    { metric: 'Accuracy', value: 94 },
    { metric: 'Speed', value: 88 },
    { metric: 'Adoption', value: 76 },
    { metric: 'Savings', value: 82 },
    { metric: 'Satisfaction', value: 91 }
  ];
  
  const wasteReductionData = [
  ];
  
  const topProducts = [
    { id: 1, name: 'Fresh Milk (1L)', revenue: 3200, profit: 1100, trend: 'up', change: '+15%' },
    { id: 2, name: 'Chicken Breast', revenue: 2800, profit: 980, trend: 'up', change: '+22%' },
    { id: 3, name: 'Greek Yogurt', revenue: 2400, profit: 850, trend: 'down', change: '-5%' },
    { id: 4, name: 'Bananas', revenue: 1900, profit: 720, trend: 'up', change: '+8%' },
    { id: 5, name: 'Cheddar Cheese', revenue: 1600, profit: 580, trend: 'up', change: '+12%' }
  ];
  
  const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
  
  const StatCard = ({ title, value, change, trend, icon: Icon, color }: any) => {
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
              <span className="text-xs text-gray-500">vs last period</span>
            </div>
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
    <div className="space-y-6">
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
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/50 flex items-center gap-2"
          >
            <Download size={18} />
            Export Report
          </motion.button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value="$0" 
          change="0%" 
          trend="up"
          icon={DollarSign} 
          color="from-green-500 to-green-600" 
        />
        <StatCard 
          title="Total Profit" 
          value="$0" 
          change="0%" 
          trend="up"
          icon={TrendingUp} 
          color="from-blue-500 to-blue-600" 
        />
        <StatCard 
          title="Items Sold" 
          value="0" 
          change="0%" 
          trend="up"
          icon={ShoppingCart} 
          color="from-purple-500 to-purple-600" 
        />
        <StatCard 
          title="Waste Reduced" 
          value="0" 
          change="0%" 
          trend="up"
          icon={Target} 
          color="from-orange-500 to-orange-600" 
        />
      </div>
      
      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue & Profit Analysis</h3>
              <p className="text-sm text-gray-600">Track your financial performance</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveMetric('revenue')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  activeMetric === 'revenue' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Revenue
              </button>
              <button 
                onClick={() => setActiveMetric('profit')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  activeMetric === 'profit' 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Profit
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
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
              <span className="text-sm font-semibold text-blue-900">Overall Score</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">94%</p>
          </div>
        </div>
      </div>
      
      {/* Category Performance & Waste Reduction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Category Performance</h3>
          <p className="text-sm text-gray-600 mb-4">Compare revenue and profit by category</p>
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
              <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-4 gap-2">
            {categoryPerformance.map((cat, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-600 mb-1">{cat.category}</p>
                <p className="text-sm font-bold text-gray-900">{cat.items} items</p>
                <p className="text-xs text-red-600 mt-1">{cat.waste}% waste</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Waste Reduction Comparison */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Waste Reduction Impact</h3>
          <p className="text-sm text-gray-600 mb-4">ML vs Traditional pricing</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={wasteReductionData}>
              <defs>
                <linearGradient id="colorWithoutML" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorWithML" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="withoutML" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorWithoutML)" name="Without ML" />
              <Area type="monotone" dataKey="withML" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorWithML)" name="With ML" />
            </AreaChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-600 mb-1">Avg. Without ML</p>
              <p className="text-2xl font-bold text-red-600">$0</p>
              <p className="text-xs text-gray-600 mt-1">waste per month</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 mb-1">Avg. With ML</p>
              <p className="text-2xl font-bold text-green-600">$0</p>
              <p className="text-xs text-gray-600 mt-1">waste per month</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Top Performing Products */}
      {/* <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Products</h3>
            <p className="text-sm text-gray-600">Best sellers this month</p>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </button>
        </div>
        
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg font-bold">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">Revenue: <span className="font-semibold text-gray-900">${product.revenue}</span></span>
                    <span className="text-sm text-gray-600">Profit: <span className="font-semibold text-green-600">${product.profit}</span></span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                  product.trend === 'up' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {product.trend === 'up' ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  <span className="text-sm font-semibold">{product.change}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div> */}
      
      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -5 }}
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white shadow-lg"
        >
          <Target size={32} className="mb-3" />
          <h3 className="text-lg font-semibold mb-1">Revenue Goal</h3>
          <p className="text-3xl font-bold mb-2">82%</p>
          <p className="text-sm text-blue-100">$67,900 / $83,000 monthly target</p>
          <div className="mt-3 h-2 bg-blue-400 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: '82%' }}></div>
          </div>
        </motion.div>
        
        <motion.div
          whileHover={{ y: -5 }}
          className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white shadow-lg"
        >
          <DollarSign size={32} className="mb-3" />
          <h3 className="text-lg font-semibold mb-1">ML Savings</h3>
          <p className="text-3xl font-bold mb-2">$12,450</p>
          <p className="text-sm text-green-100">Total saved this month through AI optimization</p>
        </motion.div>
        
        <motion.div
          whileHover={{ y: -5 }}
          className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white shadow-lg"
        >
          <Clock size={32} className="mb-3" />
          <h3 className="text-lg font-semibold mb-1">Time Saved</h3>
          <p className="text-3xl font-bold mb-2">47 hrs</p>
          <p className="text-sm text-purple-100">Manual pricing time eliminated by automation</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
