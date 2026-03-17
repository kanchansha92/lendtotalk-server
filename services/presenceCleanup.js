// services/presenceCleanup.js

const User = require("../src/models/User");


class PresenceCleanupService {
  constructor() {
    this.intervalId = null;
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    this.inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.warn('⚠️ Presence cleanup already running');
      return;
    }

    console.log('🔄 Starting presence cleanup service...');
    
    this.isRunning = true;
    
    // Run immediately on startup
    this.cleanupInactiveUsers();
    
    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.cleanupInactiveUsers();
    }, this.cleanupInterval);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Presence cleanup service stopped');
  }

  async cleanupInactiveUsers() {
    try {
      const thresholdTime = new Date(Date.now() - this.inactiveThreshold);
      
      const result = await User.updateMany(
        { 
          lastActive: { $lt: thresholdTime },
          isCurrentlyOnline: true
        },
        { 
          isCurrentlyOnline: false 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ [Presence] Marked ${result.modifiedCount} users as offline`);
      }
    } catch (error) {
      console.error('❌ [Presence] Cleanup error:', error.message);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupInterval: this.cleanupInterval,
      inactiveThreshold: this.inactiveThreshold
    };
  }
}

// Export singleton instance
module.exports = new PresenceCleanupService();