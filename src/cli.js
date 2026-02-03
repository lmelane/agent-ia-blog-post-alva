#!/usr/bin/env node

import { Command } from 'commander';
import Pipeline from './pipeline.js';
import ScoutAgent from './agents/scout.js';
import RankerAgent from './agents/ranker.js';
import WriterAgent from './agents/writer.js';
import PublisherAgent from './agents/publisher.js';
import logger from './utils/logger.js';
import fileManager from './utils/file-manager.js';

const program = new Command();

program
  .name('ai-article-agent')
  .description('CLI for AI Article Agent - Generate articles with Perplexity & Gemini')
  .version('1.0.0');

// Scout command
program
  .command('scout')
  .description('Discover hot AI topics using Deep Research (≤72h)')
  .action(async () => {
    try {
      const scout = new ScoutAgent();
      const result = await scout.run();
      
      console.log('\n✅ Scout completed');
      console.log(`📊 Discovered ${result.topics.length} valid topics`);
      
      result.topics.forEach((topic, i) => {
        console.log(`\n${i + 1}. ${topic.titre}`);
        console.log(`   Catégorie: ${topic.categorie}`);
        console.log(`   Sources: ${topic.sources?.length || 0}`);
      });
    } catch (error) {
      logger.error('Scout command failed', error);
      process.exit(1);
    }
  });

// Rank command
program
  .command('rank')
  .description('Score and rank discovered topics')
  .action(async () => {
    try {
      const ranker = new RankerAgent();
      const result = await ranker.run();
      
      console.log('\n✅ Ranking completed');
      console.log(`📊 ${result.report.passingTopics}/${result.report.totalTopics} topics passed threshold`);
      console.log(`📈 Average score: ${result.report.averageScore.toFixed(1)}`);
      
      console.log('\n🏆 Top 5 Topics:');
      result.rankedTopics.slice(0, 5).forEach((topic, i) => {
        console.log(`\n${i + 1}. [${topic.scoring.total}pts] ${topic.titre}`);
        console.log(`   Catégorie: ${topic.categorie}`);
        console.log(`   Scores: F:${topic.scoring.scores.freshness} A:${topic.scoring.scores.authority} Am:${topic.scoring.scores.amplitude} I:${topic.scoring.scores.impact} Ac:${topic.scoring.scores.actionability}`);
      });
    } catch (error) {
      logger.error('Rank command failed', error);
      process.exit(1);
    }
  });

// Write command
program
  .command('write')
  .description('Write article from top-ranked topic')
  .action(async () => {
    try {
      const writer = new WriterAgent();
      const result = await writer.run();
      
      console.log('\n✅ Article written');
      console.log(`📄 File: ${result.filename}`);
      console.log(`📊 Word count: ${result.validation.stats.wordCount}`);
      console.log(`📍 Path: ${result.filePath}`);
      if (result.frontMatter.social_post) {
        console.log(`📱 Social Post: Generated (stored in metadata)`);
      }
      
      if (result.validation.issues.length > 0) {
        console.log('\n⚠️  Validation issues:');
        result.validation.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
    } catch (error) {
      logger.error('Write command failed', error);
      process.exit(1);
    }
  });

// Full pipeline command
program
  .command('full')
  .description('Run the complete pipeline (scout → rank → write → publish)')
  .action(async () => {
    try {
      const pipeline = new Pipeline();
      const result = await pipeline.run();
      
      if (result.success) {
        console.log('\n✅ Pipeline completed successfully');
        console.log(`⏱️  Duration: ${result.duration}s`);
        console.log(`📄 Article: ${result.article.filename}`);
      } else {
        console.log('\n⚠️  Pipeline completed with issues');
        console.log(`❌ Error: ${result.error || result.message}`);
      }
    } catch (error) {
      logger.error('Pipeline command failed', error);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List all generated articles')
  .action(async () => {
    try {
      const articles = await fileManager.listArticles();
      
      console.log(`\n📚 Generated Articles (${articles.length}):\n`);
      
      if (articles.length === 0) {
        console.log('No articles found.');
      } else {
        articles.forEach((article, i) => {
          console.log(`${i + 1}. ${article}`);
        });
      }
    } catch (error) {
      logger.error('List command failed', error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current status and configuration')
  .action(async () => {
    try {
      const scoutData = await fileManager.loadScoutResults();
      const rankedData = await fileManager.loadRankedTopics();
      const briefData = await fileManager.loadBrief();
      const articles = await fileManager.listArticles();

      console.log('\n📊 AI Article Agent Status\n');
      console.log('─'.repeat(60));
      
      console.log('\n📅 Today\'s Progress:');
      console.log(`  Scout: ${scoutData ? '✅ Complete' : '❌ Not run'}`);
      if (scoutData) {
        console.log(`    Topics discovered: ${scoutData.topics?.length || 0}`);
      }
      
      console.log(`  Ranker: ${rankedData ? '✅ Complete' : '❌ Not run'}`);
      if (rankedData) {
        console.log(`    Topics passed: ${rankedData.report?.passingTopics || 0}`);
        if (rankedData.rankedTopics?.[0]) {
          console.log(`    Best topic: ${rankedData.rankedTopics[0].titre?.substring(0, 50) || 'N/A'}...`);
        }
      }
      
      console.log(`\n📚 Total Articles: ${articles.length}`);
      
      console.log('\n─'.repeat(60));
    } catch (error) {
      logger.error('Status command failed', error);
      process.exit(1);
    }
  });

program.parse();
