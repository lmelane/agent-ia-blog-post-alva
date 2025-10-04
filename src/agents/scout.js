import { deepResearch, completeJSON } from '../utils/openai-client.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import fileManager from '../utils/file-manager.js';

/**
 * Scout Agent - Discovers hot AI topics using Deep Research
 * Returns strict JSON format with categorization
 */
export class ScoutAgent {
  constructor() {
    this.topics = config.topics;
    this.categories = config.categories;
    this.freshnessWindow = config.deepResearch.freshnessWindow;
  }

  /**
   * Build research prompt for Deep Research (returns JSON)
   */
  buildResearchPrompt() {
    const categoriesStr = this.categories.join(', ');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    return `Tu es un agent de veille IA. Couvre TOUTES les actualités IA (tech, société, politique, santé, énergie, éducation, secteur public/privé), mais ROUTE toujours vers un angle ÉCONOMIQUE/FINANCIER/ORGANISATIONNEL clair (entreprise incluse).

PRIORITÉ GÉOGRAPHIQUE: France et Europe. Les sujets hors France/Europe ne sont retenus QUE s'ils ont un impact direct et chiffrable sur l'écosystème européen.

DATE COURANTE: ${today.toISOString()}
FENÊTRE: ${twoDaysAgo} → ${todayStr}

RENVOIE UNIQUEMENT DU JSON STRICT AU FORMAT SUIVANT:
{
  "topics": [
    {
      "titre": "Titre clair et accrocheur",
      "resume": "3-4 phrases avec données clés (montants, dates, parts de marché, %)",
      "impact": "Pourquoi c'est important maintenant — implications économiques, financières et organisationnelles (performance, productivité, gains de temps, emploi/restructurations, coûts/ROI)",
      "categorie": "ONE of: ${categoriesStr}",
      "angleEditorial": "Angle unique orienté décideurs",
      "questionsCentrales": ["Q1", "Q2", "Q3"],
      "donneesChiffrees": {"montants": "Ex: 500M€", "pourcentages": "+45%", "previsions": "marché 2T$ en 2030"},
      "contexteHistorique": "2-3 phrases",
      "comparaisons": "comparaisons UE/USA/Asie ou marché/concurrents",
      "citationsExperts": [{"auteur": "Nom, Titre, Org", "citation": "...", "source": "..."}],
      "controverses": "défis/risques/limites (réglementaires, sociaux, économiques)",
      "sources": [{"titre": "Source FR/EU prioritaire", "url": "https://...", "date": "${todayStr}", "typeSource": "media/report/blog/official"}],
      "keywords": ["mot1", "mot2", "mot3"],
      "publishDate": "${todayStr}T10:00:00Z"
    }
  ]
}
`;
  }

  /**
   * Validate topic freshness (≤ freshnessWindow hours)
   */
  isTopicFresh(publishDate) {
    const now = new Date();
    const pubDate = new Date(publishDate);
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);
    return hoursAgo <= this.freshnessWindow;
  }

  /**
   * Validate category against configured categories
   */
  isValidCategory(category) {
    return this.categories.includes(category);
  }

  /**
   * Validate and clean topics from JSON response
   */
  validateTopics(topics) {
    const validTopics = [];

    for (const topic of topics) {
      if (!topic.titre || !topic.resume || !topic.impact || !topic.categorie) {
        logger.warn('Topic missing required fields, skipping', { titre: topic.titre });
        continue;
      }

      if (!this.isValidCategory(topic.categorie)) {
        logger.warn(`Invalid category "${topic.categorie}" for topic "${topic.titre}"`, {
          validCategories: this.categories,
        });
        topic.categorie = 'Fintech & Innovation';
      }

      if (topic.publishDate && !this.isTopicFresh(topic.publishDate)) {
        logger.warn(`Topic too old (>${this.freshnessWindow}h): ${topic.titre}`);
        continue;
      }

      if (!topic.sources || topic.sources.length === 0) {
        logger.warn(`Topic has no sources: ${topic.titre}`);
        continue;
      }

      topic.discoveredAt = new Date().toISOString();
      topic.sourceCount = topic.sources.length;
      validTopics.push(topic);
    }

    return validTopics;
  }

  /**
   * Run the scout agent with JSON response
   */
  async run() {
    logger.info('🔍 Scout Agent: Starting Deep Research...');

    try {
      const prompt = this.buildResearchPrompt();
      logger.info('Calling Deep Research API...');

      const result = await completeJSON(prompt, {
        temperature: 0.7,
        systemPrompt: 'You are an AI research assistant that returns structured JSON data about trending AI news.',
      });

      logger.info('Deep Research completed', {
        model: result.model,
        tokensUsed: result.usage?.total_tokens,
      });

      const jsonData = result.data;
      if (!jsonData.topics || !Array.isArray(jsonData.topics)) {
        throw new Error('Invalid JSON response: missing topics array');
      }

      logger.info(`Raw topics discovered: ${jsonData.topics.length}`);
      const validTopics = this.validateTopics(jsonData.topics);
      logger.success(`Valid topics after filtering: ${validTopics.length}`);

      const byCategory = {};
      validTopics.forEach(topic => {
        byCategory[topic.categorie] = (byCategory[topic.categorie] || 0) + 1;
      });
      logger.info('Topics by category:', byCategory);

      await fileManager.saveScoutResults({
        topics: validTopics,
        metadata: {
          scoutedAt: new Date().toISOString(),
          model: result.model,
          usage: result.usage,
          totalDiscovered: jsonData.topics.length,
          validTopics: validTopics.length,
          categoriesDistribution: byCategory,
        },
      });

      return {
        topics: validTopics,
        metadata: {
          totalDiscovered: jsonData.topics.length,
          validTopics: validTopics.length,
          categoriesDistribution: byCategory,
        },
      };
    } catch (error) {
      logger.error('Scout Agent failed', error);
      throw error;
    }
  }
}

export default ScoutAgent;
