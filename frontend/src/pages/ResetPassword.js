import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
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
      
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-text">Reset Password</div>
        
        {!token ? (
          <div className="login-error" style={{ marginBottom: '20px' }}>
            Invalid or missing reset token. Please request a new password reset link.
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '20px', textAlign: 'center' }}>
              Enter your new password below. Make sure it meets all security requirements.
            </p>
            
            <label>
              New Password:
              <div className="input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                  required
                  autoFocus
                  disabled={isResetting}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.76 2.86-5.06 5.06-6.64"/><path d="M1 1l22 22"/><path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/><path d="M16.24 7.76A10.94 10.94 0 0 1 23 12a10.94 10.94 0 0 1-2.06 3.34"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {newPassword && passwordErrors.length > 0 && (
                <div className="password-requirements" style={{ fontSize: '0.85em', color: '#d32f2f', marginTop: '5px' }}>
                  <div>Password must contain:</div>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {passwordErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {newPassword && passwordErrors.length === 0 && (
                <div style={{ fontSize: '0.85em', color: '#2e7d32', marginTop: '5px' }}>
                  ✓ Password meets all requirements
                </div>
              )}
            </label>
            
            <label>
              Confirm New Password:
              <div className="input-with-icon">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={isResetting}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.76 2.86-5.06 5.06-6.64"/><path d="M1 1l22 22"/><path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/><path d="M16.24 7.76A10.94 10.94 0 0 1 23 12a10.94 10.94 0 0 1-2.06 3.34"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <div style={{ fontSize: '0.85em', color: '#d32f2f', marginTop: '5px' }}>
                  ✗ Passwords do not match
                </div>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword && (
                <div style={{ fontSize: '0.85em', color: '#2e7d32', marginTop: '5px' }}>
                  ✓ Passwords match
                </div>
              )}
            </label>
          </>
        )}
        
        {error && <div className="login-error">{error}</div>}
        
        <div className="login-buttons">
          <button type="submit" disabled={isResetting || !token} style={{ position: 'relative', minWidth: '140px' }}>
            {isResetting ? (
              <>
                <svg
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    animation: 'spin 1s linear infinite',
                    verticalAlign: 'middle'
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
                </svg>
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </div>
      </form>
      
      <div className="auth-links">
        <div className="register-link-container">
          <span>Remember your password? </span>
          <button
            type="button"
            className="register-link"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
      
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

export default ResetPassword;

