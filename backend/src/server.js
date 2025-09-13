const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
// Environment variables will be provided by Vercel's built-in system

// Import services and utilities
const db = require('./config/database');
const SocketService = require('./services/socketService');
const storageService = require('./services/storageService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');
const callRoutes = require('./routes/calls');
const pushNotificationRoutes = require('./routes/pushNotifications');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');

class WhatsAppAIServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || "http://localhost:3000",
          "https://relatim-ai.vercel.app",
          "http://localhost:3000"
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.port = process.env.PORT || 5000;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketService();
    this.initializeErrorHandling();
  }

  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://relatim-ai.vercel.app",
        "http://localhost:3000"
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Request logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving - removed for production (using S3 storage)
    // this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Rate limiting for API routes
    this.app.use('/api', apiLimiter);

    // Make io available to routes
    this.app.set('io', this.io);
  }

  initializeRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
      });
    });

    // S3 storage health check
    this.app.get('/api/storage/health', async (req, res) => {
      try {
        const result = await storageService.testConnection();
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Storage health check failed',
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/contacts', contactRoutes);
    this.app.use('/api/messages', messageRoutes);
    this.app.use('/api/ai', aiRoutes);
    this.app.use('/api/calls', callRoutes);
    this.app.use('/api/push-notifications', pushNotificationRoutes);
    this.app.use('/api/dashboard', dashboardRoutes);
    this.app.use('/api/ai', aiRoutes);

    // API documentation route
    this.app.get('/api', (req, res) => {
      res.json({
        message: 'Relatim AI Chat API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          contacts: '/api/contacts',
          messages: '/api/messages',
          ai: '/api/ai'
        }
      });
    });

    // Catch-all route for undefined API endpoints
    this.app.all('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    });

    // Serve frontend in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../../frontend/build')));
      
      this.app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../../frontend/build', 'index.html'));
      });
    }
  }

  initializeSocketService() {
    this.socketService = new SocketService(this.io);
    console.log('Socket.IO service initialized');
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.message
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }

      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
          success: false,
          message: 'Resource already exists'
        });
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File too large'
        });
      }

      // Default error response
      res.status(error.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Graceful shutdown
      this.gracefulShutdown();
    });

    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown();
    });
  }

  async gracefulShutdown() {
    console.log('Starting graceful shutdown...');
    
    try {
      // Close server
      this.server.close(() => {
        console.log('HTTP server closed');
      });

      // Close Socket.IO
      this.io.close(() => {
        console.log('Socket.IO server closed');
      });

      // Close database connections
      await db.pool.end();
      console.log('Database connections closed');

      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  async start() {
    try {
      // Test database connection
      await db.testConnection();
      
      // Test S3 storage connection
      const storageTest = await storageService.testConnection();
      if (storageTest.success) {
        console.log('✅ S3 storage connection successful');
      } else {
        console.warn('⚠️ S3 storage connection failed:', storageTest.message);
      }
      
      // Start server
      this.server.listen(this.port, () => {
        console.log(`🚀 Relatim AI Chat Server running on port ${this.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
        console.log(`📡 API endpoints: http://localhost:${this.port}/api`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
        }
      });

      // Socket.IO connection logging
      this.io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new WhatsAppAIServer();
server.start();

module.exports = server;