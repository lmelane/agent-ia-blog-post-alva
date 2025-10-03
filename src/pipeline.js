import ScoutAgent from './agents/scout.js';
import RankerAgent from './agents/ranker.js';
import WriterAgent from './agents/writer.js';
import ThumbnailAgent from './agents/thumbnail.js';
import PublisherAgent from './agents/publisher.js';
import logger from './utils/logger.js';

/**
 * Full pipeline orchestrator
 * Workflow: Scout → Ranker → Writer → Thumbnail → Publisher
 */
export class Pipeline {
  constructor() {
    this.scout = new ScoutAgent();
    this.ranker = new RankerAgent();
    this.writer = new WriterAgent();
    this.thumbnail = new ThumbnailAgent();
    this.publisher = new PublisherAgent();
  }

  /**
   * Run the complete pipeline
   */
  async run() {
    const startTime = Date.now();
    logger.info('🚀 Starting AI Article Generation Pipeline...');
    logger.info('═'.repeat(60));

    try {
      // Step 1: Scout - Deep Research for hot AI news (≤72h)
      logger.info('\n📍 STEP 1/4: Scout - Deep Research (≤72h)');
      logger.info('─'.repeat(60));
      const scoutResult = await this.scout.run();
      
      if (!scoutResult.topics || scoutResult.topics.length === 0) {
        throw new Error('No topics discovered by scout');
      }

      // Step 2: Ranker - Score topics (freshness + impact)
      logger.info('\n📍 STEP 2/4: Ranker - Scoring topics');
      logger.info('─'.repeat(60));
      const rankerResult = await this.ranker.run(scoutResult.topics);
      
      const passingTopics = rankerResult.rankedTopics.filter(t => t.scoring.passesThreshold);
      
      if (passingTopics.length === 0) {
        logger.warn('No topics passed the scoring threshold');
        logger.info('Consider using an evergreen fallback topic');
        return {
          success: false,
          message: 'No topics passed threshold',
          report: rankerResult.report,
        };
      }

      const bestTopic = passingTopics[0];
      logger.success(`Best topic selected: ${bestTopic.titre}`);
      logger.info(`Category: ${bestTopic.categorie} | Score: ${bestTopic.scoring.total}/100`);

      // Step 3: Writer - Generate article (1000-1500 words, FAQ, CTA)
      logger.info('\n📍 STEP 3/5: Writer - Generating article');
      logger.info('─'.repeat(60));
      const writerResult = await this.writer.run();

      // Step 4: Thumbnail - Generate article thumbnail
      logger.info('\n📍 STEP 4/5: Thumbnail - Generating article image');
      logger.info('─'.repeat(60));
      const thumbnailResult = await this.thumbnail.run(
        writerResult.article,
        writerResult.frontMatter
      );

      // Add thumbnail to front-matter if generated
      if (thumbnailResult.success && thumbnailResult.thumbnail) {
        writerResult.frontMatter.thumbnail = thumbnailResult.thumbnail;
        logger.success(`Thumbnail generated: ${thumbnailResult.thumbnail.filename}`);
      }

      // Step 5: Publisher (optional)
      logger.info('\n📍 STEP 5/5: Publisher - Publishing article');
      logger.info('─'.repeat(60));
      let publishResult = null;
      
      if (this.publisher.isConfigured()) {
        publishResult = await this.publisher.run(
          writerResult.article,
          writerResult.frontMatter
        );
      } else {
        logger.info('CMS not configured - skipping publication');
      }

      // Summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('\n' + '═'.repeat(60));
      logger.success(`✅ Pipeline completed successfully in ${duration}s`);
      logger.info('═'.repeat(60));
      
      logger.info('\n📊 Summary:');
      logger.info(`  Topics discovered: ${scoutResult.topics.length}`);
      logger.info(`  Topics passed threshold: ${passingTopics.length}`);
      logger.info(`  Article: ${writerResult.filename}`);
      logger.info(`  Word count: ${writerResult.validation.stats.wordCount}`);
      logger.info(`  File: ${writerResult.filePath}`);
      
      if (thumbnailResult?.success) {
        logger.info(`  Thumbnail: ${thumbnailResult.thumbnail.filename}`);
      }
      
      if (publishResult?.success) {
        logger.info(`  Published: ${publishResult.url || 'Yes'}`);
      }

      return {
        success: true,
        duration,
        scout: {
          topicsDiscovered: scoutResult.topics.length,
        },
        ranker: {
          topicsPassed: passingTopics.length,
          report: rankerResult.report,
        },
        article: {
          filename: writerResult.filename,
          filePath: writerResult.filePath,
          wordCount: writerResult.validation.stats.wordCount,
          validation: writerResult.validation,
        },
        published: publishResult?.success || false,
      };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error(`Pipeline failed after ${duration}s`, error);
      
      return {
        success: false,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Run a specific step
   */
  async runStep(step) {
    switch (step) {
      case 'scout':
        return await this.scout.run();
      case 'rank':
        return await this.ranker.run();
      case 'write':
        return await this.writer.run();
      case 'publish':
        const writerResult = await this.writer.run();
        return await this.publisher.run(
          writerResult.article,
          writerResult.frontMatter
        );
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }
}

export default Pipeline;
