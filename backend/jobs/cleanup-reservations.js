/**
 * Expired Reservations Cleanup Job
 *
 * Automatically marks expired reservations as 'expired' status.
 * Includes:
 *  - Tentative reservations past their expires_at window (DB function)
 *  - Confirmed / seated reservations more than 1 hour past reservation time
 *
 * Runs every 5 minutes by default.
 */

const cron = require('node-cron');
const { pool } = require('../config/database');

class ReservationCleanupJob {
  constructor() {
    // Configurable schedule (default: every 5 minutes)
    // Format: minute hour day month weekday
    this.schedule = process.env.CLEANUP_SCHEDULE || '*/5 * * * *';

    this.task = null;
    this.isRunning = false;
    this.stats = {
      totalRuns: 0,
      totalExpired: 0,
      lastRun: null,
      lastDuration: null,
      errors: 0
    };
  }

  /**
   * Start the cleanup job
   */
  start() {
    if (this.task) {
      console.warn('[CLEANUP] Job already running');
      return;
    }

    console.log(`[CLEANUP] Starting reservation cleanup job (schedule: ${this.schedule})`);

    this.task = cron.schedule(this.schedule, async () => {
      await this.run();
    });

    // Run immediately on startup to clean any expired during downtime
    console.log('[CLEANUP] Running initial cleanup...');
    this.run();
  }

  /**
   * Stop the cleanup job gracefully
   */
  stop() {
    if (this.task) {
      console.log('[CLEANUP] Stopping reservation cleanup job');
      this.task.stop();
      this.task = null;
    }
  }

  /**
   * Execute the cleanup operation
   */
  async run() {
    // Prevent concurrent runs
    if (this.isRunning) {
      console.log('[CLEANUP] Skipping run - previous cleanup still in progress');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[CLEANUP] Starting cleanup cycle...');

      // Try to acquire advisory lock to ensure single runner across instances
      const lockKey = parseInt(process.env.CLEANUP_ADVISORY_LOCK_KEY || '842150451', 10);
      let acquiredLock = false;
      try {
        const lockRes = await pool.query('SELECT pg_try_advisory_lock($1) AS ok', [lockKey]);
        acquiredLock = lockRes.rows[0]?.ok === true;
      } catch (e) {
        console.warn('[CLEANUP] Advisory lock error:', e.message);
      }
      if (!acquiredLock) {
        console.log('[CLEANUP] Another instance holds the lock; skipping this cycle');
        return;
      }

      // 1) Call the database function that marks expired tentative reservations
      const result = await pool.query('SELECT * FROM cleanup_expired_reservations()');

      const expiredCount = result.rows[0]?.expired_count || 0;
      const expiredIds = result.rows[0]?.expired_ids || [];

      // 2) Additional decay: mark past confirmed/seated reservations as expired
      // once they are more than 1 hour past their scheduled time.
      const decayResult = await pool.query(
        `UPDATE reservations
           SET status = 'expired',
               updated_at = NOW()
         WHERE status IN ('confirmed', 'seated')
           AND (reservation_date::timestamp + reservation_time + INTERVAL '1 hour') < NOW()
         RETURNING id`
      );

      const decayedCount = decayResult.rowCount || 0;
      const decayedIds = decayResult.rows.map((r) => r.id);

      // Update statistics
      const totalMarked = expiredCount + decayedCount;
      this.stats.totalRuns++;
      this.stats.totalExpired += totalMarked;
      this.stats.lastRun = new Date();
      this.stats.lastDuration = Date.now() - startTime;

      if (totalMarked > 0) {
        console.log(`[CLEANUP] Marked ${totalMarked} reservation(s) as expired`);
        if (expiredIds.length > 0) {
          console.log(`[CLEANUP] Tentative expired IDs: ${expiredIds.join(', ')}`);
        }
        if (decayedIds.length > 0) {
          console.log(`[CLEANUP] Decayed past-time IDs (1h+): ${decayedIds.join(', ')}`);
        }

        // Emit socket event to notify admins of expired reservations
        const io = global.io;
        if (io) {
          io.to('admin').emit('reservations-expired', {
            count: totalMarked,
            ids: [...expiredIds, ...decayedIds],
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.log('[CLEANUP] No expired reservations found');
      }

      console.log(`[CLEANUP] Cleanup completed in ${this.stats.lastDuration}ms`);
    } catch (error) {
      this.stats.errors++;
      console.error('[CLEANUP] Error during cleanup:', error.message);
      console.error('[CLEANUP] Stack trace:', error.stack);

      // Retry logic: if database connection failed, try again on next scheduled run
      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        console.log('[CLEANUP] Database connection error - will retry on next scheduled run');
      }
    } finally {
      // Best-effort unlock; ignore errors
      try {
        const lockKey = parseInt(process.env.CLEANUP_ADVISORY_LOCK_KEY || '842150451', 10);
        await pool.query('SELECT pg_advisory_unlock($1)', [lockKey]);
      } catch (_) {}
      this.isRunning = false;
    }
  }

  /**
   * Get job statistics (useful for monitoring endpoint)
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      schedule: this.schedule
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRuns: 0,
      totalExpired: 0,
      lastRun: null,
      lastDuration: null,
      errors: 0
    };
    console.log('[CLEANUP] Statistics reset');
  }
}

// Singleton instance
const cleanupJob = new ReservationCleanupJob();

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('[CLEANUP] SIGTERM received, stopping cleanup job...');
  cleanupJob.stop();
});

process.on('SIGINT', () => {
  console.log('[CLEANUP] SIGINT received, stopping cleanup job...');
  cleanupJob.stop();
});

module.exports = cleanupJob;

