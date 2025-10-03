import { deepResearch } from '../utils/openai-client.js';
import logger from '../utils/logger.js';

/**
 * Researcher Agent - Enrichit le sujet sélectionné avec recherches approfondies
 * Compile un dossier éditorial ultra-complet pour le Writer
 */
export class ResearcherAgent {
  constructor() {}

  /**
   * Build research prompt for deep investigation of selected topic
   */
  buildResearchPrompt(topic) {
    return `Tu es un journaliste d'investigation Finance x IA qui prépare un article GRAND PUBLIC ultra-pédagogique et accrocheur.

📁 SUJET SÉLECTIONNÉ:
Titre: ${topic.titre}
Résumé initial: ${topic.resume}
Impact: ${topic.impact}
Catégorie: ${topic.categorie}

Sources initiales (${topic.sources?.length || 0}):
${topic.sources?.map((s, i) => `[${i+1}] ${s.titre}: ${s.url}`).join('\n') || 'Aucune'}

🎯 MISSION CRITIQUE:
Compiler un dossier éditorial ULTRA-COMPLET pour un article destiné à des DÉCIDEURS NON-TECHNIQUES.
Le Writer doit pouvoir rédiger un article de 1200-1500 mots qui :
- VULGARISE sans simplifier à l'excès
- ACCROCHE et maintient l'attention
- VEND l'opportunité business
- INSPIRE et donne envie d'agir
- Montre qu'on a fait des RECHERCHES APPROFONDIES

🔍 RECHERCHES À EFFECTUER:

1. SOURCES COMPLÉMENTAIRES (10-15 sources minimum):
   - Médias financiers: Bloomberg, Reuters, Financial Times, Les Échos, WSJ
   - Rapports officiels: communiqués de presse, rapports annuels, études sectorielles
   - Analyses d'experts: cabinets conseil, analystes financiers, think tanks
   - Sources techniques: blogs spécialisés, documentation technique, whitepapers
   - Réseaux sociaux: LinkedIn, Twitter/X (déclarations de dirigeants)

2. DONNÉES CHIFFRÉES (maximum de chiffres):
   - Montants financiers: investissements, levées de fonds, valorisations, CA, bénéfices
   - Pourcentages: croissance, parts de marché, taux d'adoption, ROI
   - Prévisions: projections marché, estimations croissance, tendances futures
   - Statistiques sectorielles: taille du marché, nombre d'utilisateurs, volumes
   - Comparaisons temporelles: évolution sur 1 an, 5 ans, 10 ans

3. CITATIONS & TÉMOIGNAGES INSPIRANTS (5-10 minimum):
   - PDG, dirigeants : leurs VISIONS, leurs CONVICTIONS
   - Success stories : "Comment X a transformé son business grâce à..."
   - Témoignages clients : résultats concrets, ROI mesurable
   - Experts qui VULGARISENT : analogies, métaphores accessibles
   - Phrases PERCUTANTES qui donnent envie de citer
   Format: "Citation inspirante et accessible" - Prénom Nom, Fonction simple, Entreprise

4. CONTEXTE HISTORIQUE DÉTAILLÉ:
   - Timeline des événements clés (5-10 ans en arrière)
   - Précédents similaires dans le secteur
   - Évolution de la technologie/réglementation/marché
   - Moments charnières qui ont mené à cette actualité

5. COMPARAISONS INTERNATIONALES:
   - Situation dans d'autres pays (USA, Chine, Europe, etc.)
   - Différences réglementaires, culturelles, économiques
   - Leaders mondiaux vs acteurs locaux
   - Benchmarks sectoriels

6. ANALYSE CONCURRENTIELLE:
   - Principaux concurrents et leur positionnement
   - Parts de marché respectives
   - Stratégies différenciantes
   - Avantages/inconvénients de chaque acteur

7. ENJEUX & CONTROVERSES:
   - Défis techniques, économiques, réglementaires
   - Critiques et oppositions
   - Risques identifiés
   - Points de débat dans l'industrie
   - Limites de la solution/technologie

8. ANALOGIES & MÉTAPHORES PUISSANTES:
   - Comparaisons avec la vie quotidienne ("C'est comme si...")
   - Métaphores visuelles et mémorables
   - Exemples concrets que tout le monde comprend
   - Vulgarisation sans infantiliser

9. SUCCESS STORIES INSPIRANTES:
   - Entreprises qui ont TRANSFORMÉ leur business
   - Résultats CONCRETS et MESURABLES (ROI, économies, croissance)
   - Témoignages de dirigeants enthousiastes
   - "Avant/Après" spectaculaires
   - Échecs instructifs (ce qu'il ne faut PAS faire)

10. OPPORTUNITÉS BUSINESS CONCRÈTES:
    - Comment les lecteurs peuvent EN PROFITER
    - Actions concrètes à entreprendre
    - Investissements à considérer
    - Tendances à suivre
    - "Et vous, qu'allez-vous faire ?"

11. ANGLE ÉDITORIAL VENDEUR:
    - Hook principal : pourquoi c'est EXCITANT
    - Ce qui rend cette actu UNIQUE et IMPORTANTE
    - L'opportunité à NE PAS MANQUER
    - Le message inspirant à retenir
    - La vision d'avenir enthousiasmante

QUESTIONS CENTRALES (5-8 questions ACCESSIBLES):
Lister les questions que se posent les DÉCIDEURS NON-TECHNIQUES:
- "Pourquoi devrais-je m'y intéresser ?" (pertinence personnelle)
- "Comment ça marche, en simple ?" (vulgarisation)
- "Quels bénéfices concrets pour mon business ?" (ROI)
- "Qui le fait déjà et avec quels résultats ?" (preuve sociale)
- "Quels sont les risques ?" (transparence)
- "Par où commencer ?" (action concrète)
- "Que va-t-il se passer dans 2-3 ans ?" (vision future)

FORMAT DE RÉPONSE JSON:
{
  "dossierEditorial": {
    "sujet": "${topic.titre}",
    "angleEditorial": "Angle unique et percutant",
    "questionsCentrales": [
      "Question 1 stratégique",
      "Question 2 opérationnelle",
      "Question 3 prospective",
      "..."
    ],
    "sourcesComplementaires": [
      {
        "titre": "Titre source",
        "url": "https://...",
        "date": "2025-10-03",
        "typeSource": "media/report/blog/official",
        "extraits": "Points clés extraits de cette source"
      }
    ],
    "donneesChiffrees": {
      "montants": ["500M$ levés", "Valorisation 2B$", "CA 150M$ en 2024"],
      "pourcentages": ["+45% croissance YoY", "15% part de marché"],
      "previsions": ["Marché de 50B$ en 2030", "200M utilisateurs d'ici 2026"],
      "statistiques": ["85% des banques adoptent l'IA", "Réduction coûts de 30%"]
    },
    "citationsExperts": [
      {
        "auteur": "Prénom Nom",
        "fonction": "CEO",
        "entreprise": "Company X",
        "citation": "Citation exacte ou paraphrase détaillée",
        "source": "Interview Bloomberg 2025-10-02"
      }
    ],
    "contexteHistorique": {
      "timeline": [
        "2020: Événement 1",
        "2022: Événement 2",
        "2024: Événement 3"
      ],
      "precedents": "Description des situations similaires passées",
      "evolution": "Comment on en est arrivé là"
    },
    "comparaisonsInternationales": {
      "usa": "Situation aux USA",
      "europe": "Situation en Europe",
      "asie": "Situation en Asie",
      "differences": "Principales différences et raisons"
    },
    "analyseConcurrentielle": {
      "concurrents": [
        {
          "nom": "Concurrent 1",
          "partMarche": "25%",
          "positionnement": "Leader premium",
          "forces": "Innovation, brand",
          "faiblesses": "Prix élevé"
        }
      ],
      "dynamiqueMarche": "Description de la compétition"
    },
    "enjeuxControverses": {
      "defis": ["Défi technique 1", "Défi réglementaire 2"],
      "critiques": ["Critique 1 sur la vie privée", "Critique 2 sur les coûts"],
      "risques": ["Risque de concentration", "Risque de dépendance"],
      "debats": "Points de débat dans l'industrie"
    },
    "analogiesMetaphores": [
      {
        "concept": "Concept technique à vulgariser",
        "analogie": "C'est comme si vous aviez un assistant personnel qui...",
        "explication": "Explication simple et visuelle"
      }
    ],
    "successStories": [
      {
        "entreprise": "Company Y",
        "secteur": "Banking",
        "situation_avant": "Problème rencontré, coûts, inefficacités",
        "solution_adoptee": "Ce qu'ils ont mis en place",
        "resultats_apres": "ROI concret: -60% fraude, +10M$ économies/an, +25% satisfaction client",
        "citation_dirigeant": "Citation inspirante du CEO sur la transformation"
      }
    ],
    "opportunitesBusinessLecteurs": {
      "pourquoi_agir_maintenant": "Urgence et opportunité du moment",
      "actions_concretes": ["Action 1 à entreprendre", "Action 2 à considérer"],
      "investissements_surveiller": ["Secteur 1", "Technologie 2"],
      "tendances_suivre": ["Tendance 1", "Tendance 2"],
      "premier_pas": "Par où commencer concrètement"
    },
    "perspectivesFutur": {
      "vision_enthousiasmante": "Ce qui va changer dans 2-3 ans (ton optimiste)",
      "opportunites_emergentes": ["Opportunité 1", "Opportunité 2"],
      "conseil_final": "Message inspirant et actionnable"
    },
    "syntheseRecherche": {
      "hook_principal": "L'accroche qui donne envie de lire",
      "message_cle": "Le message à retenir absolument",
      "appel_action": "Ce que le lecteur doit faire après avoir lu"
    }
  }
}

EXIGENCES CRITIQUES:
- Minimum 10-15 sources complémentaires DIFFÉRENTES
- Maximum de données chiffrées concrètes (pas de généralités)
- 5-10 citations d'experts avec attribution complète
- Contexte historique détaillé avec timeline
- Comparaisons internationales factuelles
- Analyse concurrentielle approfondie
- Enjeux et controverses identifiés
- Cas d'usage concrets avec résultats mesurables
- Perspectives d'avenir avec scénarios
- Return ONLY valid JSON

Effectue maintenant une recherche EXHAUSTIVE et compile un dossier éditorial ULTRA-COMPLET.`;
  }

  /**
   * Enrich topic with deep research
   */
  async enrichTopic(topic) {
    logger.info('🔬 Researcher Agent: Enriching topic with deep research...');
    logger.info(`Topic: ${topic.titre}`);

    try {
      const prompt = this.buildResearchPrompt(topic);
      
      logger.info('Calling Deep Research for topic enrichment...');
      const result = await deepResearch(prompt, {
        responseFormat: 'json',
        maxTokens: 16000, // Recherche très approfondie
      });

      const dossier = JSON.parse(result.content);
      
      // Merge dossier with original topic
      const enrichedTopic = {
        ...topic,
        ...dossier.dossierEditorial,
        // Combiner les sources originales avec les nouvelles
        sources: [
          ...(topic.sources || []),
          ...(dossier.dossierEditorial.sourcesComplementaires || [])
        ],
        // Marquer comme enrichi
        enriched: true,
        researchTokens: result.tokensUsed,
      };

      logger.success(`✅ Topic enriched with ${dossier.dossierEditorial.sourcesComplementaires?.length || 0} additional sources`);
      logger.info(`Total sources: ${enrichedTopic.sources.length}`);
      logger.info(`Citations: ${enrichedTopic.citationsExperts?.length || 0}`);
      logger.info(`Données chiffrées: ${Object.keys(enrichedTopic.donneesChiffrees || {}).length} catégories`);

      return enrichedTopic;

    } catch (error) {
      logger.error('Failed to enrich topic', error);
      logger.warn('⚠️ Falling back to original topic data - article will be less rich');
      
      // Return original topic with basic enrichment
      return {
        ...topic,
        enriched: false,
        enrichmentError: error.message,
        // Ajouter des champs par défaut pour éviter erreurs
        analogiesMetaphores: [],
        successStories: [],
        opportunitesBusinessLecteurs: {
          actions_concretes: ['Explorer cette technologie', 'Consulter des experts'],
        },
      };
    }
  }

  /**
   * Main run method
   */
  async run(topic) {
    logger.info('🔬 Researcher Agent: Starting deep research phase...');
    
    const enrichedTopic = await this.enrichTopic(topic);
    
    if (enrichedTopic.enriched) {
      logger.success('✅ Research phase completed successfully');
      logger.info(`Dossier éditorial complet créé avec ${enrichedTopic.sources?.length || 0} sources`);
    } else {
      logger.warn('⚠️ Research enrichment failed, using original topic data');
    }

    return enrichedTopic;
  }
}

export default ResearcherAgent;
