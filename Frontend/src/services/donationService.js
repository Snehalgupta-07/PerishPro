import api from './api';

export const listDonations = async () => {
  try {
    const response = await api.get('/donations');
    return response.data;
  } catch (error) {
    throw error?.response?.data?.message || 'Failed to fetch donations list';
  }
};

export const getDonation = async (id) => {
  try {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  } catch (error) {
    throw error?.response?.data?.message || 'Failed to fetch donation details';
  }
};

export const createDonation = async (donationData) => {
  try {
    const response = await api.post('/donations', donationData);
    return response.data;
  } catch (error) {
    throw error?.response?.data?.message || 'Failed to submit donation';
  }
};

export default {
  listDonations,
  getDonation,
  createDonation
};
