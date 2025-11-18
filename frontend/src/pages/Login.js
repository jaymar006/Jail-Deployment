import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [error, setError] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const securityQuestions = [
    "What is your mother's maiden name?",
    'What was the name of your first pet?',
    'What was the name of your elementary school?',
    'What city were you born in?',
    'What is your favorite teacher\'s name?'
  ];
  const [securityQuestion1, setSecurityQuestion1] = useState(securityQuestions[0]);
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState(securityQuestions[1]);
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  // Forgot password via security questions
  const [fpUsername, setFpUsername] = useState('');
  const [fpQuestion, setFpQuestion] = useState(securityQuestions[0]);
  const [fpAnswer, setFpAnswer] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmNewPassword, setFpConfirmNewPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [showFpNewPassword, setShowFpNewPassword] = useState(false);
  const [showFpConfirmNewPassword, setShowFpConfirmNewPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRegistrationCode('');
    setError('');
    setPasswordErrors([]);
    setForgotPasswordEmail('');
    setShowForgotPassword(false);
    setIsForgotPassword(false);
    setSecurityQuestion1(securityQuestions[0]);
    setSecurityAnswer1('');
    setSecurityQuestion2(securityQuestions[1]);
    setSecurityAnswer2('');
    setFpUsername('');
    setFpQuestion(securityQuestions[0]);
    setFpAnswer('');
    setFpNewPassword('');
    setFpConfirmNewPassword('');
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
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
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
        showToast('Logged in successfully! Welcome back.', 'success');
        setTimeout(() => {
          navigate('/'); // Redirect to dashboard
        }, 1500);
      } else {
        const data = await response.json();
        const errorMessage = data.message || 'Login failed. Please check your credentials.';
        showToast(errorMessage, 'error');
        setError(errorMessage);
        
        // Check if account is locked (status 423)
        if (response.status === 423) {
          showToast(errorMessage, 'error');
        }
      }
    } catch (err) {
      showToast('Login failed: ' + err.message, 'error');
      setError('Login failed: ' + err.message);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!registrationCode) {
      showToast('Registration code is required.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please try again.', 'error');
      return;
    }

    const passwordValidation = validatePasswordStrength(password);
    if (passwordValidation.length > 0) {
      showToast('Password does not meet security requirements. Please check the requirements below.', 'error');
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
          registrationCode,
          securityQuestion1,
          securityAnswer1,
          securityQuestion2,
          securityAnswer2,
        }),
      });

      if (response.ok) {
        showToast('Account created successfully! You can now log in.', 'success');
        setIsLogin(true);
        resetForm();
      } else {
        const data = await response.json();
        const errorMessage = data.errors ? 
          data.message + ': ' + data.errors.join(', ') : 
          data.message || 'Registration failed. Please try again.';
        showToast(errorMessage, 'error');
        setError(errorMessage);
        if (data.errors) {
          setPasswordErrors(data.errors);
        }
      }
    } catch (err) {
      showToast('Registration failed: ' + err.message, 'error');
      setError('Sign up failed: ' + err.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!fpUsername) {
      showToast('Please enter your username', 'error');
      return;
    }
    if (!fpAnswer) {
      showToast('Please answer the security question', 'error');
      return;
    }
    if (!fpNewPassword || !fpConfirmNewPassword) {
      showToast('Please enter your new password', 'error');
      return;
    }
    if (fpNewPassword !== fpConfirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    const passwordValidation = validatePasswordStrength(fpNewPassword);
    if (passwordValidation.length > 0) {
      showToast('Password does not meet security requirements. Please check the requirements.', 'error');
      return;
    }

    const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
    try {
      const response = await fetch(`${apiUrl}/auth/reset-password-security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fpUsername,
          securityQuestion: fpQuestion,
          securityAnswer: fpAnswer,
          newPassword: fpNewPassword,
        }),
      });

      if (response.ok) {
        showToast('Password reset successful! You can now log in with your new password.', 'success');
        setShowForgotPassword(false);
        setFpUsername('');
        setFpAnswer('');
        setFpNewPassword('');
        setFpConfirmNewPassword('');
        setTimeout(() => {
          setIsForgotPassword(false);
        }, 2000);
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to reset password. Please check your information.', 'error');
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      showToast('Failed to reset password: ' + err.message, 'error');
      setError('Failed to reset password: ' + err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="login-logos">
          <img src="/logo1.png" alt="Logo 1" />
          <img src="/logo2.png" alt="Logo 2" />
          <img src="/logo3.png" alt="Logo 3" />
        </div>
        <h1 className="login-title">SILANG MUNICIPAL JAIL VISITATION MANAGEMENT SYSTEM</h1>
      </div>
      {isForgotPassword ? (
        <>
          <form className="login-form horizontal-form" onSubmit={handleForgotPassword}>
            <div className="login-text">Reset Password</div>
            <div className="form-row">
              <label>
                Username:
                <input
                  type="text"
                  value={fpUsername}
                  onChange={(e) => setFpUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Security Question:
                <select value={fpQuestion} onChange={(e) => setFpQuestion(e.target.value)}>
                  {securityQuestions.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </label>
              <label>
                Answer:
                <input
                  type="text"
                  value={fpAnswer}
                  onChange={(e) => setFpAnswer(e.target.value)}
                  placeholder="Enter your answer"
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                New Password:
                <div className="input-with-icon">
                  <input
                    type={showFpNewPassword ? 'text' : 'password'}
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    aria-label={showFpNewPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowFpNewPassword((v) => !v)}
                  >
                    {showFpNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.76 2.86-5.06 5.06-6.64"/><path d="M1 1l22 22"/><path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/><path d="M16.24 7.76A10.94 10.94 0 0 1 23 12a10.94 10.94 0 0 1-2.06 3.34"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </label>
              <label>
                Confirm New Password:
                <div className="input-with-icon">
                  <input
                    type={showFpConfirmNewPassword ? 'text' : 'password'}
                    value={fpConfirmNewPassword}
                    onChange={(e) => setFpConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    aria-label={showFpConfirmNewPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowFpConfirmNewPassword((v) => !v)}
                  >
                    {showFpConfirmNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.76 2.86-5.06 5.06-6.64"/><path d="M1 1l22 22"/><path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/><path d="M16.24 7.76A10.94 10.94 0 0 1 23 12a10.94 10.94 0 0 1-2.06 3.34"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </label>
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="login-buttons">
              <button type="submit">Reset Password</button>
            </div>
          </form>
          <div className="auth-links">
            <div className="register-link-container">
              <span>Remember your password? </span>
              <button
                type="button"
                className="register-link"
                onClick={() => { setIsForgotPassword(false); resetForm(); }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </>
      ) : isLogin ? (
        <>
          <form className="login-form" onSubmit={handleLoginSubmit}>
            <div className="login-text">Login</div>
            <label>
              Username:
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </label>
            <label>
              Password:
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <div className="show-password-row">
              <label className="show-password-label">
                <input
                  type="checkbox"
                  checked={showLoginPassword}
                  onChange={(e) => setShowLoginPassword(e.target.checked)}
                />
                <span> Show password</span>
              </label>
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="login-buttons">
              <button type="submit">Login</button>
            </div>
          </form>
          <div className="auth-links">
            <div className="register-link-container">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="register-link"
                onClick={() => { setIsLogin(false); resetForm(); }}
              >
                Click here
              </button>
            </div>
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setIsForgotPassword(true)}
            >
              Forgot Password?
            </button>
          </div>
        </>
      ) : (
        <>
          <form className="login-form horizontal-form" onSubmit={handleSignUpSubmit}>
            <div className="login-text">Sign Up</div>
            <div className="form-row">
              <label>
                Registration Code:
                <input
                  type="text"
                  value={registrationCode}
                  onChange={(e) => setRegistrationCode(e.target.value)}
                  placeholder="Enter registration code"
                  required
                  autoFocus
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Username:
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="At least 3 characters, letters, numbers, and underscores only"
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Password:
                <div className="input-with-icon">
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSignUpPassword((v) => !v)}
                  >
                    {showSignUpPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.76 2.86-5.06 5.06-6.64"/><path d="M1 1l22 22"/><path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/><path d="M16.24 7.76A10.94 10.94 0 0 1 23 12a10.94 10.94 0 0 1-2.06 3.34"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {password && passwordErrors.length > 0 && (
                  <div className="password-requirements" style={{ fontSize: '0.85em', color: '#d32f2f', marginTop: '5px' }}>
                    <div>Password must contain:</div>
                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                      {passwordErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {password && passwordErrors.length === 0 && (
                  <div style={{ fontSize: '0.85em', color: '#2e7d32', marginTop: '5px' }}>
                    ✓ Password meets all requirements
                  </div>
                )}
              </label>
              <label>
                Confirm Password:
                <div className="input-with-icon">
                  <input
                    type={showSignUpConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    aria-label={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                  >
                    {showSignUpConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.76 2.86-5.06 5.06-6.64"/><path d="M1 1l22 22"/><path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/><path d="M16.24 7.76A10.94 10.94 0 0 1 23 12a10.94 10.94 0 0 1-2.06 3.34"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </label>
            </div>
            <div className="form-row">
              <label>
                Security Question 1:
                <select value={securityQuestion1} onChange={(e) => setSecurityQuestion1(e.target.value)}>
                  {securityQuestions.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </label>
              <label>
                Answer 1:
                <input
                  type="text"
                  value={securityAnswer1}
                  onChange={(e) => setSecurityAnswer1(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Security Question 2:
                <select value={securityQuestion2} onChange={(e) => setSecurityQuestion2(e.target.value)}>
                  {securityQuestions.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </label>
              <label>
                Answer 2:
                <input
                  type="text"
                  value={securityAnswer2}
                  onChange={(e) => setSecurityAnswer2(e.target.value)}
                  required
                />
              </label>
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="login-buttons">
              <button type="submit">Sign Up</button>
            </div>
          </form>
          <div className="auth-links">
            <div className="register-link-container">
              <span>Already have an account? </span>
              <button
                type="button"
                className="register-link"
                onClick={() => { setIsLogin(true); resetForm(); }}
              >
                Click here
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <div className="toast-icon">
              {toast.type === 'success' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
            </div>
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close" 
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
