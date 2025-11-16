import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    console.log('Logging out due to inactivity');
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('lastActivity');
  }, []);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  const updateLastActivity = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem('lastActivity', Date.now().toString());
      console.log('Updated lastActivity timestamp');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(loggedIn);
    setLoading(false);

    const checkInactivity = () => {
      const lastActivityStr = localStorage.getItem('lastActivity');
      const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : null;
      if (loggedIn && lastActivity) {
        const now = Date.now();
        if (now - lastActivity > INACTIVITY_LIMIT) {
          logout();
        }
      } else if (loggedIn && !lastActivity) {
        // If lastActivity missing, set it now
        localStorage.setItem('lastActivity', Date.now().toString());
        console.log('Set initial lastActivity timestamp');
      }
    };

    if (loggedIn) {
      // Set initial lastActivity if not set
      if (!localStorage.getItem('lastActivity')) {
        localStorage.setItem('lastActivity', Date.now().toString());
        console.log('Set initial lastActivity timestamp on mount');
      }

      // Set interval to check inactivity every 2 minutes (increased interval)
      const intervalId = setInterval(checkInactivity, 2 * 60 * 1000);

      // Add event listeners for user activity
      const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      events.forEach(event =>
        window.addEventListener(event, updateLastActivity)
      );

      return () => {
        clearInterval(intervalId);
        events.forEach(event =>
          window.removeEventListener(event, updateLastActivity)
        );
      };
    }
  }, [isAuthenticated, logout, updateLastActivity]);

  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
