import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useToast } from '../components/ToastProvider';
import AuthShell from '../components/AuthShell';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const validatePasswordStrength = (pwd) => {
    const errors = [];
    if (!pwd) return errors;

    if (pwd.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('One uppercase letter');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('One lowercase letter');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('One number');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)) {
      errors.push('One special character');
    }

    return errors;
  };

  const handlePasswordChange = (newPwd) => {
    setNewPassword(newPwd);
    setPasswordErrors(validatePasswordStrength(newPwd));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsResetting(true);

    if (!token) {
      showToast('Invalid reset token. Please request a new password reset link.', 'error');
      setIsResetting(false);
      return;
    }

    if (!newPassword) {
      showToast('Please enter a new password.', 'error');
      setIsResetting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please try again.', 'error');
      setIsResetting(false);
      return;
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (passwordValidation.length > 0) {
      showToast('Password does not meet security requirements. Please check the requirements below.', 'error');
      setIsResetting(false);
      return;
    }

    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    try {
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || 'Password reset successfully! You can now log in with your new password.', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        let errorMessage = 'Failed to reset password. Please try again.';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
          if (data.errors) {
            setPasswordErrors(data.errors);
          }
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }
        showToast(errorMessage, 'error');
        setError(errorMessage);
        setIsResetting(false);
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error. Please check your connection and try again.';
      showToast('Failed to reset password: ' + errorMessage, 'error');
      setError('Failed to reset password: ' + errorMessage);
      setIsResetting(false);
    }
  };

  const textFieldProps = {
    fullWidth: true,
    size: 'small',
    margin: 'dense',
    sx: { mb: 1.5 },
  };

  return (
    <AuthShell title="Reset Password">
      {!token ? (
        <>
          <Alert severity="error" sx={{ mb: 2 }}>
            Invalid or missing reset token. Please request a new password reset link.
          </Alert>
          <Button fullWidth variant="contained" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </>
      ) : (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1.5 }}>
            Enter your new password below. Make sure it meets all security requirements.
          </Typography>
          <TextField
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="Min 8 chars, uppercase, lowercase, number, special char"
            autoFocus
            disabled={isResetting}
            {...textFieldProps}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{ color: '#60a5fa' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {newPassword && passwordErrors.length > 0 && (
            <Box sx={{ mb: 1, fontSize: 13, color: 'error.main' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Password must contain:</div>
              <ul style={{ margin: '5px 0', paddingLeft: 20, lineHeight: 1.6 }}>
                {passwordErrors.map((err, idx) => (
                  <li key={idx} style={{ marginBottom: 2 }}>{err}</li>
                ))}
              </ul>
            </Box>
          )}
          {newPassword && passwordErrors.length === 0 && (
            <Typography variant="caption" color="success.main" sx={{ mb: 1.5, fontWeight: 500 }}>
              Password meets all requirements
            </Typography>
          )}
          <TextField
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            disabled={isResetting}
            {...textFieldProps}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      edge="end"
                      size="small"
                      sx={{ color: '#60a5fa' }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <Typography variant="caption" color="error" sx={{ mb: 1, fontWeight: 500 }}>
              Passwords do not match
            </Typography>
          )}
          {confirmPassword && newPassword === confirmPassword && newPassword && (
            <Typography variant="caption" color="success.main" sx={{ mb: 1, fontWeight: 500 }}>
              Passwords match
            </Typography>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button type="submit" variant="contained" disabled={isResetting} sx={{ mt: 1 }}>
            {isResetting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
            Reset Password
          </Button>
        </Box>
      )}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Remember your password?{' '}
          <Button size="small" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </Typography>
      </Box>
    </AuthShell>
  );
};

export default ResetPassword;
