const express = require('express');
const cors = require('cors');
const { securityGateway } = require('./security/gateway');
const demoRoutes = require('./routes/demoRoutes');
const securityRoutes = require('./routes/securityRoutes');
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Internal management API routes (bypasses main security gateway to avoid inspection loops)
app.use('/api/security', securityRoutes);
app.use('/api/simulation', simulationRoutes);

// Protected Backend API Routes -> Passing through Security Gateway Pipeline!
app.use('/api', securityGateway, demoRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[App Error Handler]', err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal gateway error occurred.'
    }
  });
});

module.exports = app;
