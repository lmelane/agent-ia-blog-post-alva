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
    return `Tu es un chercheur expert Finance x IA chargé de compiler un DOSSIER ÉDITORIAL ULTRA-COMPLET.

📁 SUJET SÉLECTIONNÉ:
Titre: ${topic.titre}
Résumé initial: ${topic.resume}
Impact: ${topic.impact}
Catégorie: ${topic.categorie}

Sources initiales (${topic.sources?.length || 0}):
${topic.sources?.map((s, i) => `[${i+1}] ${s.titre}: ${s.url}`).join('\n') || 'Aucune'}

🎯 MISSION CRITIQUE:
Effectuer des recherches APPROFONDIES sur ce sujet pour créer un dossier éditorial complet.
Le Writer a besoin d'un maximum de matière pour rédiger un article riche de 1200-1500 mots style Les Échos.

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

3. CITATIONS D'EXPERTS (5-10 citations minimum):
   - PDG, dirigeants d'entreprises concernées
   - Analystes financiers (Goldman Sachs, Morgan Stanley, etc.)
   - Experts sectoriels (consultants, chercheurs)
   - Régulateurs, responsables politiques
   - Clients, utilisateurs (témoignages)
   Format: "Citation exacte" - Nom Prénom, Fonction, Entreprise

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

8. CAS D'USAGE & EXEMPLES CONCRETS:
   - Entreprises qui utilisent déjà cette technologie/solution
   - Résultats mesurables obtenus
   - Success stories et échecs
   - Applications pratiques dans différents secteurs

9. PERSPECTIVES D'AVENIR:
   - Scénarios d'évolution (optimiste, pessimiste, réaliste)
   - Prochaines étapes attendues
   - Impacts à 1 an, 3 ans, 5 ans
   - Tendances émergentes liées

10. ANGLE ÉDITORIAL AFFÛTÉ:
    - Pourquoi cette actualité est VRAIMENT importante MAINTENANT
    - Ce qui la rend unique/différente
    - L'angle qui intéressera les décideurs finance
    - Le message clé à retenir

QUESTIONS CENTRALES (5-8 questions):
Lister les questions que se posent les lecteurs professionnels:
- Questions stratégiques (impact business)
- Questions opérationnelles (comment ça marche)
- Questions prospectives (et demain ?)

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
    "casUsageExemples": [
      {
        "entreprise": "Company Y",
        "secteur": "Banking",
        "application": "Détection fraude en temps réel",
        "resultats": "Réduction fraude de 60%, économies 10M$/an"
      }
    ],
    "perspectivesFutur": {
      "court_terme": "Évolutions attendues 6-12 mois",
      "moyen_terme": "Impacts à 2-3 ans",
      "long_terme": "Vision 5-10 ans",
      "scenarios": {
        "optimiste": "Scénario best case",
        "realiste": "Scénario probable",
        "pessimiste": "Scénario worst case"
      }
    },
    "syntheseRecherche": {
      "pointsCles": ["Point clé 1", "Point clé 2", "Point clé 3"],
      "messagesPrincipaux": ["Message 1", "Message 2"],
      "elementsDifferenciants": "Ce qui rend ce sujet unique"
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
      // Return original topic if enrichment fails
      return {
        ...topic,
        enriched: false,
        enrichmentError: error.message,
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
