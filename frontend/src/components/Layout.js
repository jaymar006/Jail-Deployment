import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import Header from '../pages/Header';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
  { label: 'PDL Management', path: '/datas', icon: <PeopleIcon fontSize="small" /> },
  { label: 'Logs', path: '/logs', icon: <HistoryIcon fontSize="small" /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon fontSize="small" /> },
];

const SidebarContent = ({ activePath, onClose }) => {
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/') return activePath === '/';
    return activePath.startsWith(path);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'primary.main' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 2, px: 1, position: 'relative' }}>
        <img src="/logo1.png" alt="Logo 1" style={{ height: 48, objectFit: 'contain' }} />
        <img src="/logo2.png" alt="Logo 2" style={{ height: 48, objectFit: 'contain' }} />
        {onClose && (
          <IconButton
            onClick={onClose}
            aria-label="Close navigation menu"
            sx={{ position: 'absolute', right: 8, top: 8, color: '#fff', display: { md: 'none' } }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
      <List sx={{ px: 1, py: 1.5 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (onClose) onClose();
              }}
              selected={active}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                px: 1.5,
                py: 1,
                color: active ? '#fff' : 'rgba(255,255,255,0.95)',
                bgcolor: active ? 'primary.dark' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' },
                '&.Mui-selected': {
                  bgcolor: 'primary.dark',
                  color: '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 34 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: 'inherit',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
              textAlign: 'center',
            }}
          >
            <Box component="div" sx={{ fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
              SILANG MUNICIPAL JAIL
            </Box>
            <Box component="div" sx={{ fontSize: 11, opacity: 0.85 }}>
              Visitation Management System
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const Layout = ({ children }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getActivePage = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/datas') return 'PDL Management';
    if (path === '/logs') return 'Logs';
    if (path.startsWith('/visitors/')) return 'PDL Management';
    if (path === '/settings') return 'Settings';
    return '';
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, bgcolor: 'primary.main' },
          }}
        >
          <SidebarContent activePath={location.pathname} onClose={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, bgcolor: 'primary.main' },
          }}
        >
          <SidebarContent activePath={location.pathname} />
        </Drawer>
      </Box>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
        <Header activePage={getActivePage()} onMenuClick={() => setMobileOpen(true)} />
        <Box component="main" sx={{ flexGrow: 1, width: '100%', overflowY: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
