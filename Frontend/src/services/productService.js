// src/services/productService.js
import api from './api';

/**
 * listProducts(), getProduct(), updateProduct(), deleteProduct(), updateStock()
 * unchanged — only addProduct supports file upload now.
 */

export const listProducts = async (options = {}) => {
  try {
    const params = {
      ...(options.page ? { page: options.page } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
      ...(options.search ? { search: options.search } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.storeId ? { storeId: options.storeId } : {}),
      ...(options.sortBy ? { sortBy: options.sortBy } : {}),
      ...(options.sortOrder ? { sortOrder: options.sortOrder } : {}),
    };

    const response = await api.get('/products', { params });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to list products';
    throw message;
  }
};

export const getProduct = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to fetch product';
    throw message;
  }
};

/**
 * addProduct(payload, options?)
 * options: { useFormData: boolean, imageFile: File (browser File) }
 * If useFormData is true the payload will be sent as multipart/form-data:
 * - field 'data' -> JSON.stringify(payload)
 * - field 'image' -> File
 */
export const addProduct = async (payload, options = {}) => {
  try {
    if (options.useFormData && options.imageFile) {
      const form = new FormData();
      form.append('data', JSON.stringify(payload));
      form.append('image', options.imageFile);

      const response = await api.post('/products', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } else {
      // send as JSON; payload.image can be a data-URL or a remote URL
      const response = await api.post('/products', payload);
      return response.data;
    }
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to create product';
    throw message;
  }
};

export const updateProduct = async (id, payload) => {
  try {
    const response = await api.put(`/products/${id}`, payload);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to update product';
    throw message;
  }
};

export const deleteProduct = async (id, options = {}) => {
  try {
    const params = {};
    if (options.force) params.force = true;
    const response = await api.delete(`/products/${id}`, { params });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to delete product';
    throw message;
  }
};

export const updateStock = async (id, opOrPayload, amount) => {
  try {
    const payload = typeof opOrPayload === 'object' ? opOrPayload : { op: opOrPayload, amount };
    const response = await api.put(`/products/${id}/stock`, payload);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to update stock';
    throw message;
  }
};

 export const optimizeProduct = async (id) => {
  try {
    const response = await api.post(`/products/${id}/optimize`);
    return response.data;
  } catch (error) {
    throw error?.response?.data?.message || 'Failed to optimize product';
  }
};

// Backfill projected/optimized waste values so dashboard can show totals.
export const backfillWasteValues = async (options = {}) => {
  try {
    const params = {
      ...(options.limit ? { limit: options.limit } : {})
    };

    const response = await api.post('/products/backfill-waste-values', {}, { params });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to backfill waste values';
    throw message;
  }
};

export const getWasteSavedVsDay = async (range = '7d') => {
  try {
    const response = await api.get('/products/waste-saved-vs-day', { params: { range } });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to fetch wastage chart data';
    throw message;
  }
};


export default {
  listProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  optimizeProduct,
  backfillWasteValues,
  getWasteSavedVsDay
};
