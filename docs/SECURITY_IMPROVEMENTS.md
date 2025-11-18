# Security Improvements for Login System

This document outlines the security enhancements implemented for the Jail Visitation Management System.

## 🔐 Security Features Implemented

### 1. Registration Code Requirement
- **Purpose**: Prevents unauthorized user registration
- **Implementation**: 
  - Users must provide a valid registration code during signup
  - Codes can be set to expire or never expire
  - Codes are marked as used after successful registration
  - Backward compatible: If registration_codes table doesn't exist, registration is allowed (for existing deployments)

**How to create registration codes:**
```bash
# Generate a random code (valid for 90 days by default)
node backend/scripts/createRegistrationCode.js

# Create a specific code
node backend/scripts/createRegistrationCode.js MYCODE123

# Create a code valid for specific days
node backend/scripts/createRegistrationCode.js MYCODE123 30
```

**Environment Variable:**
- Set `REGISTRATION_CODE` in your `.env` file to automatically create a default code on startup

### 2. Rate Limiting
- **Purpose**: Prevents brute force attacks
- **Limits**:
  - Login: 5 attempts per 15 minutes per IP
  - Signup: 3 attempts per hour per IP
  - Password Reset: 5 attempts per hour per IP
- **Implementation**: Uses `express-rate-limit` middleware

### 3. Password Strength Requirements
- **Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
  - Cannot be a common weak password
- **Implementation**: 
  - Validated on both frontend (real-time feedback) and backend
  - Applies to signup, password reset, and password change

### 4. Account Lockout
- **Purpose**: Protects accounts from brute force attacks
- **Implementation**:
  - After 5 failed login attempts, account is locked for 30 minutes
  - Failed attempts are tracked per username
  - Lockout is automatically reset on successful login
  - Users see remaining attempts before lockout

### 5. Username Validation
- **Requirements**:
  - Minimum 3 characters
  - Only letters, numbers, and underscores allowed
- **Purpose**: Prevents injection attacks and ensures consistent usernames

### 6. Enhanced Error Messages
- Clear, user-friendly error messages
- Shows remaining login attempts
- Displays lockout duration when account is locked
- Password requirements shown in real-time during signup

## 📋 Database Tables

Two new tables are created automatically:

### `registration_codes`
- Stores registration codes
- Tracks usage and expiration
- Indexed for performance

### `account_lockouts`
- Tracks failed login attempts per username
- Stores lockout expiration times
- Indexed for performance

## 🚀 Deployment Notes

1. **Install Dependencies**: 
   ```bash
   cd backend
   npm install express-rate-limit
   ```

2. **Database Migration**: 
   The security tables are created automatically on server startup. For manual creation:
   ```bash
   node backend/scripts/createSecurityTables.js
   ```

3. **Create Initial Registration Code**:
   ```bash
   node backend/scripts/createRegistrationCode.js YOUR_CODE_HERE
   ```

4. **Environment Variables** (optional):
   ```env
   REGISTRATION_CODE=your-default-code-here
   ```

## 🔄 Backward Compatibility

- If security tables don't exist, the system gracefully falls back:
  - Registration codes: Registration allowed (backward compatible)
  - Account lockouts: No lockout tracking (backward compatible)
- Existing users are not affected
- Can be deployed incrementally

## 📝 Usage Examples

### Creating Registration Codes
```bash
# Auto-generate code
node backend/scripts/createRegistrationCode.js

# Custom code, 30 days validity
node backend/scripts/createRegistrationCode.js STAFF2024 30

# Code that never expires (set expires_at to NULL manually in DB)
```

### Testing Security Features
1. Try logging in with wrong password 5 times - account should lock
2. Try registering without a code - should be rejected
3. Try registering with weak password - should show requirements
4. Try rapid login attempts - should hit rate limit

## 🛡️ Additional Security Recommendations

1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Store sensitive values in environment variables
3. **Regular Audits**: Review registration codes periodically
4. **Monitoring**: Monitor failed login attempts and lockouts
5. **CAPTCHA**: Consider adding CAPTCHA for additional protection (future enhancement)
6. **2FA**: Consider two-factor authentication for admin accounts (future enhancement)

## 📞 Support

If you encounter issues with the security features:
1. Check that security tables exist: `registration_codes` and `account_lockouts`
2. Verify `express-rate-limit` is installed
3. Check server logs for detailed error messages
4. Ensure database connection is working

