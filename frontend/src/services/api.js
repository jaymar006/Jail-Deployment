import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const recordVisitorScan = async (visitorId) => {
  try {
    const response = await api.post('/visitors/scan', { visitor_id: visitorId });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
