import api from './api';

export const getProfile = async () => {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to fetch user profile';
    throw message;
  }
};

export const updateProfile = async (payload) => {
  try {
    const response = await api.put('/user/profile', payload);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to update profile';
    throw message;
  }
};

export const updatePassword = async (payloadOrCurrent, newPassword) => {
  try {
    const payload =
      typeof payloadOrCurrent === 'object'
        ? payloadOrCurrent
        : { currentPassword: payloadOrCurrent, newPassword };

    const response = await api.put('/user/password', payload);
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      'Failed to update password';
    throw message;
  }
};

export default {
  getProfile,
  updateProfile,
  updatePassword,
};
