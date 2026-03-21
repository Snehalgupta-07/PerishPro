import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Package, TrendingUp, DollarSign, Sparkles } from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import useAuthStore from '../store/authStore';
import { login, signup } from '../services/authService';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const authLogin = useAuthStore((state) => state.login);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // small UX delay (optional)
      await new Promise((r) => setTimeout(r, 200));

      if (isLogin) {
        // Sign in flow - pass an object
        const data = await login({ email: formData.email, password: formData.password });

        if (!data || !data.success) {
          throw new Error(data?.message ?? 'Login failed');
        }

        // expected: { success: true, token, user }
        authLogin(data.token, data.user);
        navigate('/dashboard');
      } else {
        // Sign up flow (pass object)
        const data = await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone
        });

        if (!data || !data.success) {
          throw new Error(data?.message ?? 'Signup failed');
        }

        // If backend returns token/user after signup, auto-login:
        if (data.token && data.user) {
          authLogin(data.token, data.user);
          navigate('/dashboard');
        } else {
          // otherwise switch to login screen and show success msg
          setIsLogin(true);
          setError('Account created. Please sign in.');
        }
      }
    } catch (err: any) {
      const serverMessage =
        (typeof err === 'string' && err) ||
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please try again.';
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, title: 'AI Price Optimization', desc: 'ML-powered pricing recommendations' },
    { icon: Package, title: 'Smart Inventory', desc: 'Real-time stock monitoring' },
    { icon: DollarSign, title: 'Profit Maximization', desc: 'Reduce waste, increase revenue' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity }}
        />
      </div>

      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 relative z-10">
        {/* Left side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex flex-col justify-center text-white"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-2xl">
              <Sparkles size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold">PerishPro</h1>
              <p className="text-sm text-white/90">Smart Retail Solutions</p>
            </div>
          </motion.div>

          <p className="text-xl text-white/90 mb-8">
            Transform your perishable inventory management with AI-powered pricing that maximizes profit and minimizes waste.
          </p>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-4 bg-white/10 backdrop-blur-lg rounded-xl p-4 hover:bg-white/20 transition-all"
              >
                <div className="p-2 bg-white/20 rounded-lg">
                  <feature.icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-white/80">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right side - Auth form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-xl"
        >
          <div className="text-center mb-8">
            <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }} className="text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </motion.h2>
            <p className="text-gray-600">{isLogin ? 'Sign in to your account' : 'Create your account today'}</p>
          </div>

          {error && <Alert message={error} type={error.includes('created') ? 'success' : 'error'} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <Input label="Full Name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />

                <Input label="Phone (optional)" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
              </motion.div>
            )}

            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" required />

            <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </a>
              </div>
            )}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" variant="primary" className="w-full mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Processing...
                  </span>
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </motion.div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setError('');
                setIsLogin(!isLogin);
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              {isLogin ? (
                <>Don't have an account? <span className="text-blue-600 font-medium">Sign Up</span></>
              ) : (
                <>Already have an account? <span className="text-blue-600 font-medium">Sign In</span></>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">94%</p>
                <p className="text-xs text-gray-600">Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">70%</p>
                <p className="text-xs text-gray-600">Less Waste</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">2.5x</p>
                <p className="text-xs text-gray-600">ROI</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
