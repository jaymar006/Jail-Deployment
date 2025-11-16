import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../pages/Header';

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Determine active page based on route
  const getActivePage = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/datas') return 'Datas';
    if (path === '/logs') return 'Logs';
    if (path.startsWith('/visitors/')) return 'Visitors';
    if (path === '/settings') return 'Settings';
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header activePage={getActivePage()} />
      <div style={{ flex: 1, position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;

