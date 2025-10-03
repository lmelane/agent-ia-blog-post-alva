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

FOCUS EXCLUSIF - FINANCE x IA (actualités chaudes):
✅ CE QU'ON VEUT:
- Fintech IA: néobanques, paiements intelligents, crédit scoring IA
- Trading algorithmique: nouveaux algos, hedge funds IA, robo-advisors
- Assurtech: évaluation risques IA, tarification dynamique, détection fraude
- Levées de fonds fintech IA, acquisitions, valorisations
- Régulations financières IA: RegTech, compliance, AML/KYC
- Crypto x IA: trading bots, DeFi IA, blockchain + machine learning
- Banking IA: chatbots bancaires, conseil financier IA, automatisation back-office
- Analyse prédictive: market intelligence, forecasting, risk management IA

❌ CE QU'ON NE VEUT PAS:
- Recherche académique pure (papers, études de laboratoire)
- Travaux de recherche théorique sans application business immédiate
- Publications scientifiques sans impact commercial
- Percées en recherche fondamentale sans produit

🔎 MÉTHODOLOGIE RÉDACTEUR EN CHEF - 3 PHASES:

PHASE 1 - VEILLE & IDENTIFICATION:
1. Identifier 10-15 sujets chauds Finance x IA des 48 dernières heures
2. Vérifier la fraîcheur (depuis ${twoDaysAgo} jusqu'à ${todayStr})
3. Évaluer l'impact business immédiat

PHASE 2 - RECHERCHE APPROFONDIE (pour chaque sujet):
4. Compiler 3-5 sources DIFFÉRENTES minimum (croiser les informations)
5. Extraire données chiffrées: montants, pourcentages, prévisions, statistiques
6. Identifier citations d'experts: dirigeants, analystes, chercheurs
7. Contextualiser: historique, comparaisons, tendances secteur
8. Repérer points de vue contradictoires et controverses

PHASE 3 - DOSSIER ÉDITORIAL:
9. Angle éditorial clair: pourquoi c'est important MAINTENANT
10. Questions centrales que le lecteur se pose
11. Éléments clés à développer dans l'article
12. Implications économiques, stratégiques, techniques
13. Public cible: décideurs finance, investisseurs, professionnels fintech

CRITÈRES DE QUALITÉ:
- Dates de publication précises (ISO: YYYY-MM-DD)
- URLs sources vérifiables
- Minimum 3 sources par sujet
- Données chiffrées concrètes
- Pertinence pour professionnels finance

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

REQUIRED JSON FORMAT (DOSSIER ÉDITORIAL COMPLET):
Return a JSON object with this exact structure:

{
  "topics": [
    {
      "titre": "Clear, compelling headline",
      "resume": "3-4 sentences overview with KEY DATA (chiffres, montants, dates)",
      "impact": "Why this matters NOW - business implications (2-3 sentences)",
      "categorie": "ONE of: ${categoriesStr}",
      "angleEditorial": "Unique editorial angle - what makes this story interesting",
      "questionsCentrales": [
        "Question 1 que le lecteur se pose",
        "Question 2 que le lecteur se pose",
        "Question 3 que le lecteur se pose"
      ],
      "donneesChiffrees": {
        "montants": "Ex: 500M$, 15B€",
        "pourcentages": "Ex: +45% croissance",
        "previsions": "Ex: marché de 2T$ en 2030"
      },
      "contexteHistorique": "Brief historical context, timeline, precedents (2-3 sentences)",
      "comparaisons": "Comparisons with competitors, other markets, previous situations",
      "citationsExperts": [
        {
          "auteur": "Name, Title, Company",
          "citation": "Exact quote or paraphrase",
          "source": "Source name"
        }
      ],
      "controverses": "Potential challenges, limits, criticisms, risks",
      "sources": [
        {
          "titre": "Source name",
          "url": "https://...",
          "date": "2025-10-01",
          "typeSource": "media/report/blog/official"
        }
      ],
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "publishDate": "2025-10-01T10:00:00Z"
    }
  ]
}

EXIGENCES CRITIQUES:
- Minimum 3-5 sources DIFFÉRENTES par sujet (croiser les infos)
- Données chiffrées CONCRÈTES (pas de généralités)
- Citations d'experts si disponibles
- Contexte historique pour situer l'actualité
- Points de vue contradictoires
- Angle éditorial unique
- Return ONLY valid JSON`;
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
        // Map invalid to a valid Finance x IA category fallback
        topic.categorie = 'Fintech & Innovation';
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
      logger.info('Calling Deep Research API...');

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
