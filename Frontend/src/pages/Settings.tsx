import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Store, Bell, Shield, Settings as SettingsIcon, Mail, Phone, MapPin, Save } from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import useAuthStore from '../store/authStore';
import { getProfile, updateProfile, updatePassword } from '../services/userService';

const SettingsPage: React.FC = () => {
  const authUser = useAuthStore((s: any) => s.user);
  const setAuthUser = useAuthStore((s: any) => s.setUser); // best-effort setter (may be undefined)
  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'notifications' | 'security'>('profile');

  const [formData, setFormData] = useState({
    name: authUser?.name || '',
    email: authUser?.email || '',
    storeName: authUser?.storeName || 'PerishPro Retail Store',
    phone: authUser?.phone || '',
    address: authUser?.storeAddress || '',
    notifications: {
      email: true,
      push: true,
      expiry: true,
      lowStock: true,
      priceChanges: false
    }
  });

  // security fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Load profile on mount (or when authUser changes)
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res: any = await getProfile();
        // res is expected to be { success: true, user }
        const data = res?.user ?? res;
        if (!mounted) return;
        setFormData((prev) => ({
          ...prev,
          name: data?.name ?? prev.name,
          email: data?.email ?? prev.email,
          phone: data?.phone ?? prev.phone,
          storeName: data?.storeName ?? prev.storeName,
          address: data?.storeAddress ?? prev.address
        }));
        // also update local store if it is empty
        if (!authUser && typeof setAuthUser === 'function' && data) {
          setAuthUser(data);
        }
      } catch (err: any) {
        console.error('Failed to load profile', err);
        setErrorMessage(typeof err === 'string' ? err : err?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // handle nested notification toggles separately
    if (name.startsWith('notifications.')) {
      const key = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: !prev.notifications[key as keyof typeof prev.notifications]
        }
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key as keyof typeof prev.notifications]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      setLoading(true);

      if (activeTab === 'security') {
        // Change password flow
        if (!currentPassword || !newPassword) {
          setErrorMessage('Please fill current and new password fields.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setErrorMessage('New password and confirmation do not match.');
          return;
        }

        // call service
        const res = await updatePassword({ currentPassword, newPassword });
        const message = res?.message ?? 'Password updated successfully';
        setSuccessMessage(message);

        // clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        return;
      }

      // For profile/store/notifications tabs — only send fields the API expects
      // API accepts: name, email, phone, storeName, storeAddress
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        storeName: formData.storeName,
        storeAddress: formData.address
      };

      const res = await updateProfile(payload);
      const message = res?.message ?? 'Profile updated successfully';
      setSuccessMessage(message);

      // update auth store user if returned
      const updatedUser = res?.user;
      if (updatedUser && typeof setAuthUser === 'function') {
        setAuthUser(updatedUser);
      }
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setErrorMessage(typeof err === 'string' ? err : err?.message ?? 'Failed to save settings');
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
            <SettingsIcon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-gray-800 mb-1">Settings</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'store', label: 'Store Info', icon: Store },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'security', label: 'Security', icon: Shield }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3">
          <form onSubmit={handleSubmit}>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div>
                  <h2 className="text-gray-800 mb-1">Personal Information</h2>
                  <p className="text-sm text-gray-600">Update your personal details and contact information</p>
                </div>

                {/* Avatar Section */}
                <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-800 mb-1">{authUser?.name || 'User'}</h3>
                    <p className="text-sm text-gray-600 mb-2">{authUser?.email || 'user@example.com'}</p>
                    <button type="button" className="text-sm text-blue-600 hover:text-blue-700">
                      Change Avatar
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 123-4567"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Store Tab */}
            {activeTab === 'store' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div>
                  <h2 className="text-gray-800 mb-1">Store Information</h2>
                  <p className="text-sm text-gray-600">Manage your store details and location</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Store Name *</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Store Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your store address"
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Store Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 mb-1">Total Products</p>
                      <p className="text-gray-800">89 items</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600 mb-1">Active Categories</p>
                      <p className="text-gray-800">6 categories</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div>
                  <h2 className="text-gray-800 mb-1">Notification Preferences</h2>
                  <p className="text-sm text-gray-600">Choose how you want to receive notifications</p>
                </div>

                <div className="space-y-4">
                  {Object.entries(formData.notifications).map(([key, val]) => {
                    const labelMap: any = {
                      email: ['Email Notifications', 'Receive updates via email'],
                      push: ['Push Notifications', 'Receive push notifications in browser'],
                      expiry: ['Expiry Alerts', 'Get notified about expiring products'],
                      lowStock: ['Low Stock Alerts', 'Alerts when inventory runs low'],
                      priceChanges: ['Price Change Notifications', 'Updates on price recommendations']
                    };
                    return (
                      <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-gray-800">{labelMap[key][0]}</p>
                          <p className="text-sm text-gray-600">{labelMap[key][1]}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={val as boolean}
                            onChange={() => handleNotificationChange(key)}
                            className="sr-only peer"
                            name={`notifications.${key}`}
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div>
                  <h2 className="text-gray-800 mb-1">Security Settings</h2>
                  <p className="text-sm text-gray-600">Manage your password and security preferences</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex gap-2">
                    <Shield className="text-yellow-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-yellow-800 mb-1">Password Requirements</p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• At least 8 characters long</li>
                        <li>• Include uppercase and lowercase letters</li>
                        <li>• Include at least one number</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 flex gap-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </Button>
              <button type="button" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => {
                // reset form to authUser values
                setFormData({
                  name: authUser?.name || '',
                  email: authUser?.email || '',
                  storeName: authUser?.storeName || 'PerishPro Retail Store',
                  phone: authUser?.phone || '',
                  address: authUser?.storeAddress || '',
                  notifications: formData.notifications
                });
                setSuccessMessage('');
                setErrorMessage('');
              }}>
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;
