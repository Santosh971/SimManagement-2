const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth/auth.routes');
const companyRoutes = require('./routes/company/company.routes');
const subscriptionRoutes = require('./routes/subscription/subscription.routes');
const simRoutes = require('./routes/sim/sim.routes');
const rechargeRoutes = require('./routes/recharge/recharge.routes');
const callLogRoutes = require('./routes/callLog/callLog.routes');
const notificationRoutes = require('./routes/notification/notification.routes');
const dashboardRoutes = require('./routes/dashboard/dashboard.routes');
const statusRoutes = require('./routes/status/status.routes');
const paymentRoutes = require('./routes/payment/payment.routes');
const reportRoutes = require('./routes/report/report.routes');
const userRoutes = require('./routes/user/user.routes');
const auditLogRoutes = require('./routes/auditLog/auditLog.routes');
const whatsappRoutes = require('./routes/whatsapp/whatsapp.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import services
const cronService = require('./jobs');

// Create Express app
const app = express();

// Connect to database
connectDB().then(() => {
  // Initialize cron jobs after database connection
  cronService.initJobs();
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://simtracker.b100x.in',
    'https://sim-management-rho.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19001',
    'http://localhost:19002',
    'http://localhost:19006',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/sims', simRoutes);
app.use('/api/recharges', rechargeRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   SIM Management SaaS API                        ║
  ║   Server running on port ${PORT}                    ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                       ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;