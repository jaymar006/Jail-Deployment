const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not found in environment variables');
  console.warn('🔧 Generating a temporary JWT secret...');
  console.warn('💡 For production, please set JWT_SECRET in your .env file');
  
  // Generate a temporary secret (this will change on each restart)
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn('🔐 Temporary JWT secret generated (will change on restart)');
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
