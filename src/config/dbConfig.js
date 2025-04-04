import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

class MongoDBConnectionManager {
  constructor(config = {}) {
    this.config = {
      // Default options
      autoIndex: process.env.NODE_ENV === 'development' ? false : true,
      serverSelectionTimeoutMS: config.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: config.socketTimeoutMS || 45000,
      family: config.family || 4,
      retryWrites: config.retryWrites || true,
      retryReads: config.retryReads || true,
      maxPoolSize: config.maxPoolSize || 10,
      minPoolSize: config.minPoolSize || 5,
      connectTimeoutMS: config.connectTimeoutMS || 10000,
      heartbeatFrequencyMS: config.heartbeatFrequencyMS || 10000,
      ...config
    };

    // Connection URLs based on environment
    this.urls = {
      development: process.env.DEV_DB_URI,
      test: process.env.TEST_DB_URI,
      production: process.env.PROD_DB_URI,
      staging: process.env.STAGING_DB_URI
    };

    this.enableHealthCheck = config.enableHealthCheck ?? true;
    this.healthCheckInterval = config.healthCheckInterval ?? 30000;
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectInterval = config.reconnectInterval || 5000;
  }

  getDbUrl() {
    const env = process.env.NODE_ENV === 'test' ? 'test' : 'development';

    const url = this.urls[env];
    
    if (!url) {
      throw new Error(`No MongoDB URL configured for environment: ${env}`);
    }
    
    return url;
  }

  async connect() {
    try {
      const url = this.getDbUrl();
      logger.info(`🔄 Connecting to MongoDB in ${process.env.NODE_ENV} environment...`);
  
      this.connection = mongoose.connection; 
      this._setupEventListeners();
  
      const startTime = Date.now();
      await mongoose.connect(url, this.config); 
      const connectionTime = Date.now() - startTime;
      logger.info(`✅ MongoDB connected successfully in ${connectionTime}ms`);
  
      this._setupHealthCheck();

    setTimeout(async () => {
      try {
        const stats = await this.getStats();
        // logger.info(`📊 Database Stats: ${JSON.stringify(stats, null, 2)}`);
      } catch (err) {
        logger.error(`❌ Failed to get database stats: ${err.message}`);
      }
    }, 1000); 

  
      return this.connection;
    } catch (error) {
      logger.error(`❌ MongoDB connection error: ${error.message}`);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.warn(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval}ms...`);
        
        // Implement exponential backoff
        const backoffTime = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
        
        setTimeout(() => this.connect(), backoffTime); } else {
          logger.error('❌ Maximum reconnection attempts reached. Exiting process.');
          process.exit(1);
        }
    }
  }
  
  _setupEventListeners() {
    if (!this.connection) {
      logger.error('⚠️ No MongoDB connection available for setting up event listeners.');
      return;
    }
    mongoose.connection.removeAllListeners(); // Clear previous event listeners to prevent duplicates
    mongoose.connection.on('connected', () => {
      logger.info('🟢 MongoDB connected');
      this.reconnectAttempts = 0;
      this._setupHealthCheck();
    });
  
    mongoose.connection.on('error', (err) => {
      logger.error(`🔴 MongoDB connection error: ${err.message}`);
    });
  
    mongoose.connection.on('disconnected', () => {
      console.log('what adisaster it is')
      logger.warn('🟡 MongoDB disconnected');
    });
  
    mongoose.connection.on('reconnected', () => {
      logger.info('🔵 MongoDB reconnected');
    });
  
    process.once('SIGINT', async () => await this.disconnect('SIGINT'));
    process.once('SIGTERM', async () => await this.disconnect('SIGTERM'));
    process.once('uncaughtException', async (error) => {
      logger.error(`❌ Uncaught Exception: ${error.message}`);
      await this.disconnect('uncaughtException');
    });
  }
  _setupHealthCheck() {
    const interval = this.config.healthCheckInterval ?? 1000000; // Default 90 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - start;
  
        logger.debug(`💓 MongoDB Health Check: Healthy (Response Time: ${responseTime}ms)`);
      } catch (error) {
        logger.error(`❌ MongoDB Health Check Failed: ${error.message}`);
      }
    }, interval);
  }
  
  

  async disconnect(signal) {
    logger.info(`🛑 Disconnecting MongoDB due to ${signal}`);
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      if (mongoose.connection.readyState !== 0) {
       
          mongoose.connection.close();
        logger.info(`🛑 MongoDB connection closed due to ${signal || 'application termination'}`);
      }
      
      if (signal !== 'uncaughtException') {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (error) {
      logger.error(`❌ Error during MongoDB shutdown: ${error.message}`);
      process.exit(1);
    }
  }

  async getStats() {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB is not connected');
      }
      // console.log('Fetching DB Stats...');
      
      const stats = await mongoose.connection.db.stats();
      const status = await mongoose.connection.db.admin().serverStatus();
      
      return {
        dbStats: stats,
        connectionCount: status.connections,
        uptime: status.uptime,
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      logger.error(`❌ Error getting MongoDB stats: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
export const mongoManager = new MongoDBConnectionManager();

// Export connect function for backward compatibility
export const connectDB = () => mongoManager.connect();

// Export the class for custom instantiation
export default MongoDBConnectionManager;