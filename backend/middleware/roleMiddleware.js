const userModel = require('../models/userModel');

/**
 * requireAdmin - role guard for admin-only endpoints.
 * Re-fetches the user from the database so the check reflects the current role
 * even for tokens issued before a role change (and for old JWTs without a role claim).
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await userModel.findUserById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    next();
  } catch (err) {
    console.error('Error checking admin role:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { requireAdmin };
