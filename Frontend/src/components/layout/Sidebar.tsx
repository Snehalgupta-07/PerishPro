import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard, Package, PlusCircle, BarChart3, TrendingUp, Settings, Zap } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/add-product', label: 'Add Product', icon: PlusCircle, badge: null },
    // { path: '/analytics', label: 'Analytics', icon: BarChart3, badge: 'New' },
    { path: '/price-predictor', label: 'Price Predictor', icon: TrendingUp, badge: 'AI' },
    { path: '/settings', label: 'Settings', icon: Settings, badge: null }
  ];
  
  return (
    <aside className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white w-64 min-h-screen p-4 border-r border-gray-700">
      {/* Quick Stats */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold">AI Active</span>
        </div>
        <div className="mt-3 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '94%' }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          />
        </div>
        {/* <p className="text-xs text-gray-400 mt-1">94% Accuracy</p> */}
      </div>
      
      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon size={20} />
                    </motion.div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold relative z-10 ${
                        item.badge === 'New'
                          ? 'bg-green-500 text-white'
                          : item.badge === 'AI'
                          ? 'bg-purple-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;