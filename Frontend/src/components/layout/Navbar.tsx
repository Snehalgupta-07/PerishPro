import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, User, LogOut, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const Navbar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const notifications = [
    { id: 1, text: '5 products expiring today', type: 'warning', time: '5m ago' },
    { id: 2, text: 'Price optimization complete', type: 'success', time: '1h ago' },
    { id: 3, text: 'New inventory alert', type: 'info', time: '2h ago' }
  ];
  
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40 backdrop-blur-lg bg-white/90">
      <div className="flex items-center justify-between">
        {/* Logo & Search */}
        <div className="flex items-center gap-6 flex-1">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl"
            >
              <Sparkles size={20} className="text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                PerishPro
              </h1>
              <p className="text-xs text-gray-500">Retail Store</p>
            </div>
          </Link>
          
          {/* Search Bar */}
          {/* <div className="hidden md:flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search products, categories..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
          </div> */}
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </motion.button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    <span className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">Mark all read</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className="p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notif.type === 'warning' ? 'bg-yellow-500' : 
                            notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{notif.text}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-gray-200">
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all notifications</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </motion.button>
            
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <User size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{user?.name}</p>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <Link to="/settings" className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <SettingsIcon size={18} className="text-gray-600" />
                      <span className="text-sm text-gray-700">Settings</span>
                    </Link>
                    <Link to="/logout" className="flex items-center gap-3 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors text-red-600">
                      <LogOut size={18} />
                      <span className="text-sm">Logout</span>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;