const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pdlRoutes = require('./routes/pdlRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const authRoutes = require('./routes/authRoutes');
const cellRoutes = require('./routes/cellRoutes');

const app = express();
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, allow all origins for mobile/network access
    // This is safe because we're behind a firewall/network
    if (process.env.NODE_ENV === 'production') {
      // Log for debugging
      console.log(`CORS: Allowing origin ${origin}`);
      return callback(null, true);
    }
    
    // Development: restrict to localhost
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/pdls', pdlRoutes);
app.use('/api/cells', cellRoutes);
app.use('/api', visitorRoutes);
app.use('/auth', authRoutes);

// Health check endpoint for deployment platforms
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Serve frontend static files if in production or build folder exists
const path = require('path');
const fs = require('fs');
const buildPath = path.join(__dirname, '..', 'frontend', 'build');

if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  // Fallback route to serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


  