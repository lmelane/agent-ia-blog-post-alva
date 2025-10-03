import logger from '../utils/logger.js';
import fileManager from '../utils/file-manager.js';
import config from '../config.js';

/**
 * Ranker Agent - Scores and ranks discovered topics
 */
export class RankerAgent {
  constructor() {
    this.minScore = config.scoring.minScoreToPublish;
  }

  /**
   * Enrich topic with additional metadata for scoring
   */
  enrichTopic(topic) {
    return {
      ...topic,
      sourceCount: topic.sources?.length || 1,
      metadata: {
        isAcademic: this.isAcademicSource(topic),
        isOfficialBlog: this.isOfficialBlog(topic),
        hasCodeExamples: this.hasCodeExamples(topic),
        citationCount: 0, // Could be enhanced with API calls
        ...topic.metadata,
      },
    };
  }

  isAcademicSource(topic) {
    const sources = topic.sources || [];
    const academicDomains = ['arxiv.org', '.edu', 'acm.org', 'ieee.org'];
    
    return sources.some(s => 
      academicDomains.some(domain => s.url?.toLowerCase().includes(domain))
    );
  }

  isOfficialBlog(topic) {
    const sources = topic.sources || [];
    const officialDomains = [
      'openai.com/blog',
      'deepmind.com/blog',
      'ai.meta.com',
      'microsoft.com/research',
      'research.google',
      'anthropic.com/news',
    ];
    
    return sources.some(s => 
      officialDomains.some(domain => s.url?.toLowerCase().includes(domain))
    );
  }

  hasCodeExamples(topic) {
    const text = (topic.resume || topic.impact || '').toLowerCase();
    return /\b(code|github|example|demo|implementation|snippet)\b/.test(text);
  }

  /**
   * Score a single topic (simplifié - score basique)
   */
  scoreTopic(topic) {
    // Score simplifié : juste basé sur la fraîcheur et le nombre de sources
    const now = new Date();
    const pubDate = new Date(topic.publishDate || now);
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);
    
    let freshnessScore = 20;
    if (hoursAgo > 24) freshnessScore = 15;
    if (hoursAgo > 48) freshnessScore = 10;
    
    const sourceScore = Math.min((topic.sources?.length || 1) * 5, 20);
    const total = freshnessScore + sourceScore;

    return {
      ...topic,
      scoring: {
        scores: {
          freshness: freshnessScore,
          sources: sourceScore,
        },
        total,
        maxScore: 40,
        percentage: Math.round((total / 40) * 100),
        passesThreshold: total >= 20, // Seuil très bas
      },
    };
  }

  /**
   * Rank topics (simplifié - juste tri par fraîcheur)
   */
  rankTopics(topics) {
    const scoredTopics = topics.map(topic => this.scoreTopic(topic));
    
    // Sort by freshness (most recent first)
    scoredTopics.sort((a, b) => b.scoring.total - a.scoring.total);

    return scoredTopics;
  }

  /**
   * Filter topics that pass the threshold
   */
  filterPassingTopics(rankedTopics) {
    return rankedTopics.filter(topic => topic.scoring.passesThreshold);
  }

  /**
   * Generate ranking report
   */
  generateReport(rankedTopics) {
    const passing = this.filterPassingTopics(rankedTopics);
    
    return {
      totalTopics: rankedTopics.length,
      passingTopics: passing.length,
      failingTopics: rankedTopics.length - passing.length,
      threshold: this.minScore,
      topTopic: rankedTopics[0] || null,
      averageScore: rankedTopics.reduce((sum, t) => sum + t.scoring.total, 0) / rankedTopics.length,
      scoreDistribution: {
        excellent: rankedTopics.filter(t => t.scoring.total >= 90).length,
        good: rankedTopics.filter(t => t.scoring.total >= 70 && t.scoring.total < 90).length,
        fair: rankedTopics.filter(t => t.scoring.total >= 50 && t.scoring.total < 70).length,
      },
    };
  }

  /**
   * Check if a topic is similar to already published articles
   */
  async isDuplicate(topic) {
    try {
      const articles = await fileManager.listArticles();
      
      // Extract keywords from topic title
      const topicKeywords = topic.titre.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      for (const articleFile of articles) {
        const articleTitle = articleFile
          .replace(/^\d{4}-\d{2}-\d{2}-/, '')
          .replace(/\.md$/, '')
          .replace(/-/g, ' ')
          .toLowerCase();
        
        const matchingKeywords = topicKeywords.filter(keyword => 
          articleTitle.includes(keyword)
        );
        
        if (matchingKeywords.length >= 3) {
          logger.warn(`Duplicate detected: "${topic.titre}" similar to "${articleFile}"`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.warn('Could not check for duplicates', error);
      return false;
    }
  }

  /**
   * Run the ranker agent
   */
  async run(topics = null) {
    logger.info('📊 Ranker Agent: Scoring topics...');

    if (!topics || topics.length === 0) {
      // Try to load from scout results
      const scoutData = await fileManager.loadScoutResults();
      if (!scoutData || !scoutData.topics) {
        throw new Error('No topics to rank. Run scout first.');
      }
      topics = scoutData.topics;
    }

    logger.info(`Scoring ${topics.length} topics...`);
    
    // Filter out duplicates
    const uniqueTopics = [];
    for (const topic of topics) {
      const isDup = await this.isDuplicate(topic);
      if (!isDup) {
        uniqueTopics.push(topic);
      }
    }
    
    if (uniqueTopics.length < topics.length) {
      logger.info(`Filtered out ${topics.length - uniqueTopics.length} duplicate topics`);
    }
    
    topics = uniqueTopics;

    if (topics.length === 0) {
      throw new Error('No unique topics found after filtering duplicates');
    }

    // Rank topics
    const rankedTopics = this.rankTopics(topics);

    // Generate report
    const report = this.generateReport(rankedTopics);

    logger.success(`Ranking complete: ${report.passingTopics}/${report.totalTopics} topics passed threshold`);
      logger.info('Score distribution:', report.scoreDistribution);

      // Log top 3 topics
    logger.info('\n📈 Top 3 Topics:');
    rankedTopics.slice(0, 3).forEach((topic, index) => {
      logger.info(`${index + 1}. [${topic.scoring.total}pts] ${topic.titre}`);
    });

    // Save results
    await fileManager.saveRankedTopics({
      rankedTopics,
      report,
      metadata: {
        rankedAt: new Date().toISOString(),
        threshold: this.minScore,
      },
    });

    return {
      rankedTopics,
      report,
    };
  }
}

export default RankerAgent;
