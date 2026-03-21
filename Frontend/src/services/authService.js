// src/services/authService.js
import api from './api';

/**
 * Accepts either:
 *  - login({ email, password })
 *  - login(email, password)
 * Returns: the response data (axios response.data)
 */
export const login = async (payloadOrEmail, password) => {
  try {
    const payload =
      typeof payloadOrEmail === 'object'
        ? payloadOrEmail
        : { email: payloadOrEmail, password };

    const response = await api.post('/auth/sign-in', payload);
    return response.data;
  } catch (error) {
    // throw a consistent error (string or object as you prefer)
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Login failed';
    throw message;
  }
};

/**
 * Accepts either:
 *  - signup({ name, email, password, phone })
 *  - signup(name, email, password, phone)
 * Returns: the response data (axios response.data)
 */
export const signup = async (payloadOrName, email, password, phone) => {
  try {
    const payload =
      typeof payloadOrName === 'object'
        ? payloadOrName
        : { name: payloadOrName, email, password, phone };

    const response = await api.post('/auth/sign-up', payload);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Registration failed';
    throw message;
  }
};

export default { login, signup };
