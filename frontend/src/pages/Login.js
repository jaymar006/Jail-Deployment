import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import AuthShell from '../components/AuthShell';

const PasswordRequirements = ({ password, errors }) => {
  if (!password) return null;
  if (errors.length > 0) {
    return (
      <Box sx={{ mt: 1, fontSize: 13, color: 'error.main' }}>
        <div>Password must contain:</div>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      </Box>
    );
  }
  return (
    <Box sx={{ mt: 1, fontSize: 13, color: 'success.main' }}>Password meets all requirements.</Box>
  );
};

const BotInfoIcon = () => {
  const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'BJMPnoreplybot';
  return (
    <Tooltip
      interactive
      placement="right"
      title={
        <Box sx={{ p: 0.5, maxWidth: 300 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, mb: 0.5 }}>
            <InfoOutlinedIcon fontSize="small" color="info" />
            Start Bot First
          </Box>
          <Box sx={{ fontSize: 13, lineHeight: 1.5, mb: 1 }}>
            Start our Telegram bot before requesting password reset:
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              @{botUsername}
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="primary"
              component="a"
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ whiteSpace: 'nowrap', minWidth: 0 }}
            >
              Open
            </Button>
          </Box>
          <Box sx={{ fontSize: 12, lineHeight: 1.4 }}>
            <strong>Note:</strong> After &quot;Start&quot;, send a message (e.g., &quot;hello&quot;) to the bot.
          </Box>
        </Box>
      }
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 6,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          },
        },
      }}
    >
      <IconButton size="small" aria-label="Telegram bot information">
        <InfoOutlinedIcon sx={{ fontSize: 20 }} color="action" />
      </IconButton>
    </Tooltip>
  );
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [fpUsernameOrTelegram, setFpUsernameOrTelegram] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const showToast = useToast();

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRegistrationCode('');
    setTelegramUsername('');
    setError('');
    setPasswordErrors([]);
    setIsForgotPassword(false);
    setFpUsernameOrTelegram('');
  };

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

  const handlePasswordChange = (newPassword) => {
    setPassword(newPassword);
    setPasswordErrors(validatePasswordStrength(newPassword));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        login();
        showToast(`Logged in successfully! Welcome back, ${username}.`, 'success');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        let errorMessage = 'Login failed. Please check your credentials.';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }

        showToast(errorMessage, 'error');
        setError(errorMessage);
        setIsLoggingIn(false);
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error. Please check your connection and try again.';
      showToast(errorMessage, 'error');
      setError(errorMessage);
      setIsLoggingIn(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSigningUp(true);

    if (!registrationCode) {
      showToast('Registration code is required.', 'error');
      setIsSigningUp(false);
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please try again.', 'error');
      setIsSigningUp(false);
      return;
    }

    const passwordValidation = validatePasswordStrength(password);
    if (passwordValidation.length > 0) {
      showToast('Password does not meet security requirements. Please check the requirements below.', 'error');
      setIsSigningUp(false);
      return;
    }

    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    try {
      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          telegramUsername: telegramUsername.trim() || null,
          registrationCode,
        }),
      });

      if (response.ok) {
        showToast('Account created successfully! You can now log in.', 'success');
        setIsLogin(true);
        resetForm();
        setIsSigningUp(false);
      } else {
        let errorMessage = 'Registration failed. Please try again.';
        try {
          const data = await response.json();
          errorMessage = data.errors
            ? data.message + ': ' + data.errors.join(', ')
            : data.message || errorMessage;
          if (data.errors) {
            setPasswordErrors(data.errors);
          }
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }
        showToast(errorMessage, 'error');
        setError(errorMessage);
        setIsSigningUp(false);
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error. Please check your connection and try again.';
      showToast('Registration failed: ' + errorMessage, 'error');
      setError('Sign up failed: ' + errorMessage);
      setIsSigningUp(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsRequestingReset(true);

    if (!fpUsernameOrTelegram.trim()) {
      showToast('Please enter your username or Telegram username', 'error');
      setIsRequestingReset(false);
      return;
    }

    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    try {
      const response = await fetch(`${apiUrl}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrTelegram: fpUsernameOrTelegram.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || 'If an account exists, a password reset link has been sent to your Telegram.', 'success');
        setFpUsernameOrTelegram('');
        setIsRequestingReset(false);
        setTimeout(() => {
          setIsForgotPassword(false);
        }, 2000);
      } else {
        let errorMessage = 'Failed to request password reset. Please try again.';
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }
        showToast(errorMessage, 'error');
        setError(errorMessage);
        setIsRequestingReset(false);
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error. Please check your connection and try again.';
      showToast('Failed to request password reset: ' + errorMessage, 'error');
      setError('Failed to request password reset: ' + errorMessage);
      setIsRequestingReset(false);
    }
  };

  const textFieldProps = {
    fullWidth: true,
    size: 'small',
    margin: 'dense',
    sx: {
      mb: 1.5,
      '& .MuiOutlinedInput-root': { borderRadius: '10px' },
    },
  };

  return (
    <AuthShell title={isForgotPassword ? 'Forgot Password' : isLogin ? 'Login' : 'Sign Up'}>
      {isForgotPassword ? (
        <>
          <Box
            component="form"
            onSubmit={handleForgotPassword}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Reset via Telegram
              </Typography>
              <BotInfoIcon />
            </Box>
            <TextField
              label="Username or Telegram Username"
              value={fpUsernameOrTelegram}
              onChange={(e) => setFpUsernameOrTelegram(e.target.value)}
              placeholder="Enter your username or Telegram username (e.g., @username)"
              autoFocus
              disabled={isRequestingReset}
              {...textFieldProps}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Enter your username or Telegram username and we&apos;ll send you a link to reset your
              password via Telegram.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isRequestingReset}
              sx={{ mt: 1, py: 1.25, fontWeight: 700, fontSize: '0.95rem', borderRadius: '12px' }}
            >
              {isRequestingReset && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
              Send Reset Link
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Remember your password?{' '}
              <Button
                size="small"
                onClick={() => {
                  setIsForgotPassword(false);
                  resetForm();
                }}
              >
                Back to Login
              </Button>
            </Typography>
          </Box>
        </>
      ) : isLogin ? (
        <>
          <Box component="form" onSubmit={handleLoginSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
            <TextField
              label="Username"
              placeholder="e.g. Juandelacruz06"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              {...textFieldProps}
            />
            <TextField
              label="Password"
              placeholder="Enter your password"
              type={showLoginPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              {...textFieldProps}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowLoginPassword((v) => !v)}
                        edge="end"
                        size="small"
                        sx={{ color: '#1e3a8a' }}
                      >
                        {showLoginPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5, mb: 1.5 }}>
              <Button
                size="small"
                onClick={() => setIsForgotPassword(true)}
                sx={{ fontWeight: 600 }}
              >
                Forgot Password?
              </Button>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isLoggingIn}
              sx={{ mt: 1, py: 1.25, fontWeight: 700, fontSize: '0.95rem', borderRadius: '12px' }}
            >
              {isLoggingIn && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
              Login
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don&apos;t have an account?{' '}
              <Button
                size="small"
                onClick={() => {
                  setIsLogin(false);
                  resetForm();
                }}
              >
                Sign Up
              </Button>
            </Typography>
          </Box>
        </>
      ) : (
        <>
          <Box component="form" onSubmit={handleSignUpSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
            <TextField
              label="Registration Code"
              value={registrationCode}
              onChange={(e) => setRegistrationCode(e.target.value)}
              placeholder="Enter registration code"
              autoFocus
              {...textFieldProps}
            />
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="At least 3 characters, letters, numbers, and underscores only"
              {...textFieldProps}
            />
            <TextField
              label="Password"
              type={showSignUpPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Min 8 chars, uppercase, lowercase, number, special char"
              {...textFieldProps}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowSignUpPassword((v) => !v)}
                        edge="end"
                        size="small"
                        sx={{ color: '#1e3a8a' }}
                      >
                        {showSignUpPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <PasswordRequirements password={password} errors={passwordErrors} />
            <TextField
              label="Confirm Password"
              type={showSignUpConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              {...textFieldProps}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                        edge="end"
                        size="small"
                        sx={{ color: '#1e3a8a' }}
                      >
                        {showSignUpConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {confirmPassword && confirmPassword !== password && (
              <Typography variant="caption" color="error" sx={{ mb: 1 }}>
                Passwords do not match
              </Typography>
            )}
            {confirmPassword && confirmPassword === password && (
              <Typography variant="caption" color="success.main" sx={{ mb: 1 }}>
                Passwords match
              </Typography>
            )}
            <TextField
              label="Telegram Username (Optional)"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="Enter Telegram username (optional)"
              {...textFieldProps}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Optional: Add your Telegram username for password recovery. You can add this later in
              Settings.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isSigningUp}
              sx={{ mt: 1, py: 1.25, fontWeight: 700, fontSize: '0.95rem', borderRadius: '12px' }}
            >
              {isSigningUp && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
              Sign Up
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Button
                size="small"
                onClick={() => {
                  setIsLogin(true);
                  resetForm();
                }}
              >
                Login
              </Button>
            </Typography>
          </Box>
        </>
      )}
    </AuthShell>
  );
};

export default Login;
