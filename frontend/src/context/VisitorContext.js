import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const VisitorContext = createContext();

export const VisitorProvider = ({ children }) => {
  const [visitorData, setVisitorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        // Removed invalid API endpoint to prevent 404 error
        // const res = await api.get('/api/pdls/visitors');
        // setVisitorData(res.data);
        setVisitorData([]); // Set empty data for now
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };
    fetchVisitors();
  }, []);

  return (
    <VisitorContext.Provider value={{ visitorData, loading, error }}>
      {children}
    </VisitorContext.Provider>
  );
};
