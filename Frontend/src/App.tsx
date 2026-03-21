import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/Inventory';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/ProductDetail';
import Analytics from './pages/Analytics';
import PricePredictor from './pages/PricePredictor';
import SettingsPage from './pages/Settings';
import Logout from './pages/Logout';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/logout" element={<Logout />} />
        
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InventoryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/product/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProductDetail />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-product"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AddProduct />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Analytics />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/price-predictor"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PricePredictor />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        
        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;