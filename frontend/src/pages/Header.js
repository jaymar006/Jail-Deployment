import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import MuiLink from '@mui/material/Link';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const Header = ({ activePage, breadcrumbs = [], onMenuClick }) => {
  const navigate = useNavigate();
  const showToast = useToast();
  const { isAuthenticated, logout } = useContext(AuthContext);
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState(null);
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
        setRole(payload.role || null);
      } catch (e) {
        setUsername(null);
        setRole(null);
      }
    } else {
      setUsername(null);
      setRole(null);
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    setAnchorEl(null);
    showToast('Logged out successfully', 'success');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Typography variant="h6" component="h1" noWrap sx={{ fontSize: 18 }}>
            {activePage}
          </Typography>
          {breadcrumbs.length > 1 && (
            <Breadcrumbs
              aria-label="breadcrumb"
              separator="/"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                '& .MuiBreadcrumbs-separator': { mx: 0.75 },
                color: 'text.secondary',
              }}
            >
              {breadcrumbs.map((crumb, i) =>
                i === breadcrumbs.length - 1 ? (
                  <Typography key={i} color="text.primary" sx={{ fontSize: 13, fontWeight: 600 }}>
                    {crumb.label}
                  </Typography>
                ) : (
                  <MuiLink
                    key={i}
                    component={Link}
                    to={crumb.to}
                    underline="hover"
                    color="inherit"
                    sx={{ fontSize: 13 }}
                  >
                    {crumb.label}
                  </MuiLink>
                )
              )}
            </Breadcrumbs>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {breadcrumbs.length > 1 && (
          <Button
            component={Link}
            to={breadcrumbs[0].to}
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Back
          </Button>
        )}
        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              {username}
            </Typography>
            {role === 'admin' && (
              <Typography
                variant="caption"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  fontWeight: 700,
                  color: '#2563eb',
                  bgcolor: '#dbeafe',
                  borderRadius: '6px',
                  px: 0.75,
                  py: 0.25,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Admin
              </Typography>
            )}
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
