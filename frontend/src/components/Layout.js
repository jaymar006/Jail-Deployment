import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../pages/Header';
import './Layout.css';

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
    <div className="layout-wrapper">
      <Header activePage={getActivePage()} />
      <div className="layout-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;

