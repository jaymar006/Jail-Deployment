// src/components/Header.js
import React, { useContext, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Header.css';

const Header = ({ activePage }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [username, setUsername] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        setUsername(payload.username || null);
      } catch (e) {
        setUsername(null);
      }
    } else {
      setUsername(null);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownOpen(false);
    }
    if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
      setMobileMenuOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    if (dropdownOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, mobileMenuOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false); // Also close dropdown when navigating
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <div className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={closeMobileMenu}></div>
      
      <header className="dashboard-header">
        <div className="header-top">
          <div className="logos">
            <img src="/logo1.png" alt="Logo 1" />
            <img src="/logo2.png" alt="Logo 2" />
          </div>
          <div className="header-text">
            <h2>SILANG MUNICIPAL JAIL VISITATION MANAGEMENT SYSTEM</h2>
          </div>
          <button 
            className="mobile-menu-toggle" 
            onClick={(e) => {
              e.stopPropagation();
              toggleMobileMenu();
            }} 
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>
        </div>
        <nav className={`nav-buttons ${mobileMenuOpen ? 'mobile-open' : ''}`} ref={mobileMenuRef} onClick={(e) => e.stopPropagation()}>
          {/* Mobile Sidebar Header with Logos */}
          <div className="mobile-sidebar-header">
            <div className="mobile-sidebar-logos">
              <img src="/logo1.png" alt="Logo 1" />
              <img src="/logo2.png" alt="Logo 2" />
            </div>
            <button className="mobile-sidebar-close" onClick={closeMobileMenu} aria-label="Close menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        <Link to="/" onClick={handleNavClick}>
          <button className={location.pathname === '/' ? 'active' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
        </Link>
        <Link to="/datas" onClick={handleNavClick}>
          <button className={location.pathname === '/datas' ? 'active' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Datas
          </button>
        </Link>
        <Link to="/logs" onClick={handleNavClick}>
          <button className={location.pathname === '/logs' ? 'active' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Logs
          </button>
        </Link>
        {isAuthenticated && (
          <div className="dropdown" ref={dropdownRef}>
            <button className={`dropdown-toggle ${dropdownOpen ? 'dropdown-open' : ''}`} onClick={toggleDropdown}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {username}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <Link to="/settings" className="dropdown-item" onClick={() => { setDropdownOpen(false); closeMobileMenu(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Settings
                </Link>
                <button className="dropdown-item" onClick={() => { setDropdownOpen(false); handleLogout(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
    </>
  );
};

export default Header;
