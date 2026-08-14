import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthContext } from '../context/AuthContext';

const Header = ({ activePage, onMenuClick }) => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [username, setUsername] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
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
    setAnchorEl(null);
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 3 } }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          sx={{ mr: 1.5, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="h1" noWrap sx={{ fontSize: 18 }}>
          {activePage}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              {username}
            </Typography>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              aria-label="User account menu"
              sx={{ ml: 0.5 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {(username || '?').charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem component={Link} to="/settings" onClick={() => setAnchorEl(null)}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
