#!/usr/bin/env node

import cron from 'node-cron';
import config from './config.js';
import logger from './utils/logger.js';
import Pipeline from './pipeline.js';

/**
 * Main entry point - Runs as a scheduled daemon
 */
class ArticleAgentDaemon {
  constructor() {
    this.pipeline = new Pipeline();
    this.isRunning = false;
  }

  /**
   * Execute the daily pipeline
   */
  async executeDailyPipeline() {
    if (this.isRunning) {
      logger.warn('Pipeline already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const date = new Date().toLocaleString('fr-FR', { timeZone: config.schedule.timezone });
    
    logger.info('═'.repeat(60));
    logger.info(`🤖 Daily Article Agent - ${date}`);
    logger.info('═'.repeat(60));

    try {
      const result = await this.pipeline.run();
      
      if (result.success) {
        logger.success('Daily article generation completed');
      } else {
        logger.warn('Daily article generation completed with warnings');
      }
    } catch (error) {
      logger.error('Daily pipeline execution failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the daemon with cron scheduler
   */
  start() {
    logger.info('🚀 Starting AI Article Agent Daemon');
    logger.info(`⏰ Schedule: Daily at 09:00 (${config.schedule.timezone})`);
    logger.info(`📁 Output directory: ${config.output.articlesDir}`);
    logger.info(`🎯 Topics: ${config.topics.join(', ')}`);
    logger.info('─'.repeat(60));

    // Schedule daily execution at 09:00
    const cronJob = cron.schedule(
      config.schedule.cronExpression,
      () => {
        this.executeDailyPipeline();
      },
      {
        scheduled: true,
        timezone: config.schedule.timezone,
      }
    );

    logger.success('Daemon started successfully');
    logger.info('Waiting for scheduled execution...');
    logger.info('Press Ctrl+C to stop');

    // Optional: Run immediately on startup (for testing)
    if (process.env.RUN_ON_START === 'true') {
      logger.info('RUN_ON_START enabled, executing pipeline now...');
      setTimeout(() => {
        this.executeDailyPipeline();
      }, 2000);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('\nReceived SIGINT, shutting down gracefully...');
      cronJob.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('\nReceived SIGTERM, shutting down gracefully...');
      cronJob.stop();
      process.exit(0);
    });
  }
}

// Start the daemon
const daemon = new ArticleAgentDaemon();
daemon.start();
