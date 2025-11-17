/**
 * Database Migration Runner
 * Professional-grade migration system with transaction support and rollback
 */

const { pool } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, '..', 'migrations');
  }

  /**
   * Run a single migration file
   * @param {string} filename - Migration filename
   * @param {boolean} dryRun - If true, rollback after execution (for testing)
   */
  async runMigration(filename, dryRun = false) {
    const client = await pool.connect();
    const startTime = Date.now();

    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Running migration: ${filename}`);
      console.log(`Dry run: ${dryRun ? 'YES (will rollback)' : 'NO'}`);
      console.log(`${'='.repeat(80)}\n`);

      // Read migration file
      const migrationPath = path.join(this.migrationsDir, filename);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');

      // Extract version from filename
      const version = filename.replace('.sql', '');

      // Begin transaction
      await client.query('BEGIN');

      // Execute migration
      console.log('Executing SQL...');
      await client.query(migrationSQL);

      const executionTime = Date.now() - startTime;

      // Update execution time in migration record
      await client.query(
        `UPDATE schema_migrations
         SET execution_time_ms = $1
         WHERE version = $2`,
        [executionTime, version]
      );

      if (dryRun) {
        console.log('\n⚠️  DRY RUN MODE - Rolling back changes...');
        await client.query('ROLLBACK');
        console.log('✅ Rollback successful');
      } else {
        await client.query('COMMIT');
        console.log('\n✅ Migration committed successfully');
      }

      console.log(`⏱️  Execution time: ${executionTime}ms`);

      return {
        success: true,
        version,
        executionTime,
        dryRun
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Migration failed:', error.message);
      console.error('Stack trace:', error.stack);

      throw new Error(`Migration failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(dryRun = false) {
    try {
      // Get all migration files
      const files = await fs.readdir(this.migrationsDir);
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .sort(); // Alphabetical order (timestamp-based naming)

      if (sqlFiles.length === 0) {
        console.log('No migration files found');
        return;
      }

      console.log(`Found ${sqlFiles.length} migration file(s)`);

      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      console.log(`Already applied: ${appliedMigrations.size} migration(s)`);

      // Filter pending migrations
      const pendingMigrations = sqlFiles.filter(file => {
        const version = file.replace('.sql', '');
        return !appliedMigrations.has(version);
      });

      if (pendingMigrations.length === 0) {
        console.log('\n✅ No pending migrations');
        return;
      }

      console.log(`\nPending migrations: ${pendingMigrations.length}`);
      pendingMigrations.forEach(file => console.log(`  - ${file}`));

      // Run each pending migration
      const results = [];
      for (const file of pendingMigrations) {
        const result = await this.runMigration(file, dryRun);
        results.push(result);
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log('MIGRATION SUMMARY');
      console.log(`${'='.repeat(80)}`);
      console.log(`Total migrations run: ${results.length}`);
      console.log(`Total execution time: ${results.reduce((sum, r) => sum + r.executionTime, 0)}ms`);
      console.log(`Status: ${dryRun ? 'DRY RUN (rolled back)' : 'COMMITTED'}`);
      console.log(`${'='.repeat(80)}\n`);

      return results;

    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Get set of applied migration versions
   */
  async getAppliedMigrations() {
    const client = await pool.connect();

    try {
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          applied_at TIMESTAMP DEFAULT NOW(),
          execution_time_ms INTEGER
        )
      `);

      const result = await client.query(
        'SELECT version FROM schema_migrations ORDER BY applied_at'
      );

      return new Set(result.rows.map(row => row.version));

    } finally {
      client.release();
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          version,
          description,
          applied_at,
          execution_time_ms
        FROM schema_migrations
        ORDER BY applied_at DESC
      `);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Check if database is up to date
   */
  async checkStatus() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql'));
      const appliedMigrations = await this.getAppliedMigrations();

      const pending = sqlFiles.filter(file => {
        const version = file.replace('.sql', '');
        return !appliedMigrations.has(version);
      });

      console.log('\n' + '='.repeat(80));
      console.log('DATABASE MIGRATION STATUS');
      console.log('='.repeat(80));
      console.log(`Total migration files: ${sqlFiles.length}`);
      console.log(`Applied migrations: ${appliedMigrations.size}`);
      console.log(`Pending migrations: ${pending.length}`);

      if (pending.length > 0) {
        console.log('\nPending:');
        pending.forEach(file => console.log(`  - ${file}`));
      } else {
        console.log('\n✅ Database is up to date');
      }

      console.log('='.repeat(80) + '\n');

      return {
        total: sqlFiles.length,
        applied: appliedMigrations.size,
        pending: pending.length,
        pendingFiles: pending
      };

    } catch (error) {
      console.error('Failed to check migration status:', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'up':
          await runner.runPendingMigrations(false);
          break;

        case 'dry-run':
          await runner.runPendingMigrations(true);
          break;

        case 'status':
          await runner.checkStatus();
          break;

        case 'history':
          const history = await runner.getMigrationHistory();
          console.log('\nMigration History:');
          console.table(history);
          break;

        case 'run':
          const filename = process.argv[3];
          if (!filename) {
            console.error('Please specify migration filename');
            process.exit(1);
          }
          await runner.runMigration(filename, false);
          break;

        default:
          console.log(`
Database Migration Runner

Usage:
  node utils/migrate.js <command>

Commands:
  status      Show migration status
  up          Run all pending migrations
  dry-run     Run migrations in test mode (rollback after)
  history     Show migration history
  run <file>  Run specific migration file

Examples:
  node utils/migrate.js status
  node utils/migrate.js up
  node utils/migrate.js dry-run
  node utils/migrate.js run 20250113_tentative_reservations.sql
          `);
      }

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = MigrationRunner;
