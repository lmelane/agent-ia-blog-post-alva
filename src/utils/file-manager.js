import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import logger from './logger.js';

class FileManager {
  constructor() {
    this.articlesDir = config.output.articlesDir;
    this.dataDir = path.join(this.articlesDir, '.data');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.articlesDir, { recursive: true });
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories', error);
    }
  }

  /**
   * Save scout results (discovered topics)
   */
  async saveScoutResults(topics) {
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.dataDir, `scout-${date}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(topics, null, 2));
    logger.info(`Scout results saved: ${filePath}`);
    return filePath;
  }

  /**
   * Load scout results
   */
  async loadScoutResults(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filePath = path.join(this.dataDir, `scout-${targetDate}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`No scout results found for ${targetDate}`);
      return null;
    }
  }

  /**
   * Save ranked topics
   */
  async saveRankedTopics(rankedTopics) {
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.dataDir, `ranked-${date}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(rankedTopics, null, 2));
    logger.info(`Ranked topics saved: ${filePath}`);
    return filePath;
  }

  /**
   * Load ranked topics
   */
  async loadRankedTopics(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filePath = path.join(this.dataDir, `ranked-${targetDate}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`No ranked topics found for ${targetDate}`);
      return null;
    }
  }

  /**
   * Save brief
   */
  async saveBrief(brief) {
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.dataDir, `brief-${date}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(brief, null, 2));
    logger.info(`Brief saved: ${filePath}`);
    return filePath;
  }

  /**
   * Load brief
   */
  async loadBrief(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filePath = path.join(this.dataDir, `brief-${targetDate}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn(`No brief found for ${targetDate}`);
      return null;
    }
  }

  /**
   * Save article
   */
  async saveArticle(article, filename) {
    const filePath = path.join(this.articlesDir, filename);
    
    await fs.writeFile(filePath, article);
    logger.success(`Article saved: ${filePath}`);
    return filePath;
  }

  /**
   * List all articles
   */
  async listArticles() {
    try {
      const files = await fs.readdir(this.articlesDir);
      return files.filter(f => f.endsWith('.md'));
    } catch (error) {
      logger.error('Failed to list articles', error);
      return [];
    }
  }
}

export const fileManager = new FileManager();
export default fileManager;
