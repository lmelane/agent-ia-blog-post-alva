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
    const topicsStr = this.topics.join(', ');
    const categoriesStr = this.categories.join(', ');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 48*60*60*1000).toISOString().split('T')[0];
    
    return `Tu es un agent de veille IA spécialisé dans les actualités IA BUSINESS et ENTREPRISE.

DATE ET HEURE ACTUELLES: ${today.toISOString()} (${today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })})

MISSION ULTRA-CRITIQUE: Trouve 5-10 actualités IA BUSINESS publiées dans les DERNIÈRES 48 HEURES (depuis le ${twoDaysAgo} jusqu'à maintenant ${todayStr}).

FOCUS EXCLUSIF - ACTUALITÉS IA BUSINESS/ENTREPRISE:
✅ CE QU'ON VEUT:
- Lancements de produits IA commerciaux (nouveaux modèles, APIs, services)
- Annonces d'entreprises tech (OpenAI, Google, Meta, Anthropic, Microsoft, startups)
- Financements, levées de fonds, acquisitions, valorisations
- Nouvelles régulations et politiques IA affectant les entreprises
- Partenariats stratégiques et collaborations business
- Outils IA pour entreprises (productivité, marketing, ventes, etc.)
- Cas d'usage IA en entreprise et ROI
- Tendances du marché IA et prévisions business

❌ CE QU'ON NE VEUT PAS:
- Recherche académique pure (papers, études de laboratoire)
- Travaux de recherche théorique sans application business immédiate
- Publications scientifiques sans impact commercial
- Percées en recherche fondamentale sans produit

CRITÈRES ULTRA-STRICTS:
1. Actualités publiées dans les 48 DERNIÈRES HEURES UNIQUEMENT (depuis ${twoDaysAgo} jusqu'à ${todayStr})
2. Impact BUSINESS/COMMERCIAL immédiat
3. Sources multiples et crédibles avec URLs
4. Pertinence pour les entreprises et décideurs
5. OBLIGATOIRE: Dates de publication précises au format ISO (YYYY-MM-DD)

EXEMPLES D'ACTUALITÉS À CHERCHER:
- "OpenAI lance GPT-5 pour les entreprises"
- "Microsoft investit 10 milliards dans l'IA"
- "Nouvelle startup IA lève 100M$"
- "Google annonce Gemini Pro pour entreprises"
- "L'UE adopte une nouvelle réglement IA"
- "Meta lance des outils IA pour le marketing"

IMPORTANT: Utilise la recherche web en temps réel. EXCLUS toute recherche académique pure!

CATEGORIZATION:
For each topic, assign it to ONE of these 8 specific categories based on its primary focus:

1. **Lancements Produits**: New AI products, models (GPT-5, Claude, Gemini), APIs, platforms launched
   Exemples: "OpenAI lance GPT-5", "Google dévoile Gemini Ultra", "Anthropic annonce Claude 3"

2. **Financements & Deals**: Funding rounds, acquisitions, investments, valuations, IPOs
   Exemples: "Startup IA lève 100M$", "Microsoft acquiert une startup IA", "OpenAI valorisé à 80B$"

3. **Outils & Plateformes**: AI tools for business (productivity, automation, SaaS, no-code)
   Exemples: "Notion AI pour la productivité", "Zapier lance l'automatisation IA", "Canva AI"

4. **Marketing & Ventes**: AI for marketing, sales, customer engagement, advertising, CRM
   Exemples: "HubSpot IA pour le marketing", "Salesforce Einstein", "ChatGPT pour le service client"

5. **Stratégie & Tendances**: Market trends, industry analysis, business strategy, forecasts
   Exemples: "Le marché de l'IA atteint 500B$", "Gartner prévoit...", "Tendances IA 2025"

6. **Régulations & Politique**: AI regulations, policies, compliance, ethics, governance
   Exemples: "UE adopte l'AI Act", "Biden signe un décret sur l'IA", "RGPD et IA"

7. **Cas d'Usage**: Real business use cases, ROI, success stories, implementations
   Exemples: "Comment Netflix utilise l'IA", "ROI de 300% avec ChatGPT", "Cas client Coca-Cola"

8. **Partenariats**: Strategic partnerships, collaborations, integrations, alliances
   Exemples: "OpenAI s'associe avec Microsoft", "Google et Salesforce", "Partenariat Meta-IBM"

REQUIRED JSON FORMAT:
Return a JSON object with this exact structure:

{
  "topics": [
    {
      "titre": "Clear, compelling headline",
      "resume": "2-3 sentence overview of the news",
      "impact": "Why this matters - business/tech implications (1-2 sentences)",
      "categorie": "ONE of: ${categoriesStr}",
      "sources": [
        {
          "titre": "Source name",
          "url": "https://...",
          "date": "2025-10-01"
        }
      ],
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "publishDate": "2025-10-01T10:00:00Z"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON
- Each topic must have 2-5 sources with URLs and dates
- Filter out anything older than 72 hours
- Choose the MOST relevant category for each topic
- Include specific data points and metrics in the resume`;
  }

  /**
   * Validate topic freshness (≤ 72 hours)
   */
  isTopicFresh(publishDate) {
    const now = new Date();
    const pubDate = new Date(publishDate);
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);
    return hoursAgo <= this.freshnessWindow;
  }

  /**
   * Validate category
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
      // Validate required fields
      if (!topic.titre || !topic.resume || !topic.impact || !topic.categorie) {
        logger.warn('Topic missing required fields, skipping', { titre: topic.titre });
        continue;
      }

      // Validate category
      if (!this.isValidCategory(topic.categorie)) {
        logger.warn(`Invalid category "${topic.categorie}" for topic "${topic.titre}"`, {
          validCategories: this.categories,
        });
        // Try to assign a default category
        topic.categorie = 'Technologie';
      }

      // Validate freshness
      if (topic.publishDate && !this.isTopicFresh(topic.publishDate)) {
        logger.warn(`Topic too old (>${this.freshnessWindow}h): ${topic.titre}`);
        continue;
      }

      // Validate sources
      if (!topic.sources || topic.sources.length === 0) {
        logger.warn(`Topic has no sources: ${topic.titre}`);
        continue;
      }

      // Add metadata
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
      logger.info('Calling Deep Research API with JSON mode...');

      // Use completeJSON for structured output
      const result = await completeJSON(prompt, {
        temperature: 0.7,
        systemPrompt: 'You are an AI research assistant that returns structured JSON data about trending AI news.',
      });

      logger.info('Deep Research completed', {
        model: result.model,
        tokensUsed: result.usage?.total_tokens,
      });

      // Extract topics from JSON
      const jsonData = result.data;
      
      if (!jsonData.topics || !Array.isArray(jsonData.topics)) {
        throw new Error('Invalid JSON response: missing topics array');
      }

      logger.info(`Raw topics discovered: ${jsonData.topics.length}`);

      // Validate and filter topics
      const validTopics = this.validateTopics(jsonData.topics);
      logger.success(`Valid topics after filtering: ${validTopics.length}`);

      // Log topics by category
      const byCategory = {};
      validTopics.forEach(topic => {
        byCategory[topic.categorie] = (byCategory[topic.categorie] || 0) + 1;
      });
      logger.info('Topics by category:', byCategory);

      // Save results
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
