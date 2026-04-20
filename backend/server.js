// backend/server.js
const path = require('path');

let driveSync = null;
try {
  driveSync = require('./utils/driveSync');
} catch (e) {
  console.warn('Drive sync disabled:', e.message);
}

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch (e) {
  console.warn('env not installed; skipping .env loading');
}



const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

// =====================
// Middleware Setup
// =====================
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, curl, same-origin
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());
const { uploadsDir } = require('./middleware/upload');
app.use('/uploads', express.static(uploadsDir));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add express-fileupload for AI detection and training routes
const fileUpload = require('express-fileupload');
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  createParentPath: true
}));
const driveRoutes = require('./routes/driveRoutes');
app.use('/api/drive', driveRoutes);
// Translation proxy to avoid browser CORS issues
try {
  const translateRoutes = require('./routes/translateRoutes');
  app.use('/api/translate', translateRoutes);
} catch (e) {
  console.warn('Translate routes not available:', e.message);
}


// =====================
// Database Setup
// =====================
const { sequelize } = require('./models');

sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
    // Ensure any newly added models (e.g., AccountingEntry) are created.
    // Using plain sync() (without alter/force) will create missing tables without changing existing ones.
    return sequelize.sync();
  })
  .then(() => {
    console.log('Database models synchronized');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

// =====================
// Route Setup
// =====================
// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const saleRoutes = require('./routes/saleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const backupRoutes = require('./routes/backupRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const aiDetectionRoutes = require('./routes/aiDetectionRoutes');
const trainingRoutes = require('./routes/trainingRoutes');

// ✅ CORRECTLY IMPORT THE 'protect' FUNCTION
const { protect } = require('./middleware/auth');
const paymentRoutes = require('./routes/paymentRoutes');

// Public route - does not need protection
app.use('/api/auth', authRoutes);

// ✅ CORRECTLY APPLY THE 'protect' MIDDLEWARE FUNCTION TO ALL PROTECTED ROUTES
app.use('/api/products', protect, productRoutes);
app.use('/api/sales', protect, saleRoutes);
app.use('/api/customers', protect, customerRoutes);
app.use('/api/analytics', protect, analyticsRoutes);
app.use('/api/backup', protect, backupRoutes);
app.use('/api/payments', protect, paymentRoutes);
app.use('/api/accounting', protect, accountingRoutes);
app.use('/api/ai/detect', aiDetectionRoutes);
app.use('/api/training', trainingRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// =====================
// Error Handling & 404
// =====================
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// =====================
// Backup Scheduling
// =====================
try {
  const { scheduleBackups } = require('./utils/backup');
  scheduleBackups();
} catch (error) {
  console.log('Backup scheduling not available:', error.message);
}

// =====================
// Server Startup
// =====================
const desiredPortFromEnv = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
const initialPort = desiredPortFromEnv || 5000;

const startServer = (port, attemptsLeft = 5) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
    console.log(`Health check available at: http://localhost:${port}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attemptsLeft > 0) {
        const nextPort = port + 1;
        if (desiredPortFromEnv) {
          console.warn(`Port ${port} (from PORT env) is in use. Falling back to ${nextPort}... (${attemptsLeft - 1} attempts left)`);
        } else {
          console.warn(`Port ${port} in use. Retrying on port ${nextPort}... (${attemptsLeft - 1} attempts left)`);
        }
        setTimeout(() => startServer(nextPort, attemptsLeft - 1), 300);
      } else {
        console.error('Failed to start server: No available ports found.');
        process.exit(1);
      }
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });
};

startServer(initialPort);

(async () => {
  try {
    // DISABLED: Auto drive sync on startup - only manual sync via buttons now
    // if (driveSync && typeof driveSync.syncDatabase === 'function') {
    //   await driveSync.syncDatabase();
    // }
    // DISABLED: Auto drive sync - only manual sync via buttons now
    // if (driveSync && typeof driveSync.scheduleDailySync === 'function') {
    //   driveSync.scheduleDailySync();
    //   console.log('Drive daily sync scheduler initialized');
    // }
  } catch (error) {
    console.error('Startup sync error:', error);
  }
})();

process.on('SIGINT', async () => {
  try {
    // DISABLED: Auto drive sync on shutdown - only manual sync via buttons now
    // if (driveSync && typeof driveSync.syncDatabase === 'function') {
    //   await driveSync.syncDatabase();
    // }
    process.exit(0);
  } catch (error) {
    console.error('Shutdown sync error:', error);
    process.exit(1);
  }
});



module.exports = app;
