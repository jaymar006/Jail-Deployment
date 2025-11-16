const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// ✅ Import the database connection
require('./config/db');

// ✅ Import route files
const pdlRoutes = require('./routes/pdlRoutes');
const visitorRoutes = require('./routes/visitorRoutes'); // Optional, only if you have this file

app.use(cors());
app.use(express.json());

// ✅ Set up routes
app.use('/pdls', pdlRoutes);
app.use('/visitors', visitorRoutes); // Optional

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.send('API running');
});

// ✅ Start server with port conflict handling
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please stop the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
});
