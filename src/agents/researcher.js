import { perplexitySearch } from '../utils/perplexity-client.js';
import { geminiCompleteJSON } from '../utils/gemini-client.js';
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
    return `Tu es un journaliste Tech expert qui prépare un tutoriel/analyse approfondie pour Beauchoix.fr.
Sujet : "${topic.titre}"

OBJECTIF : Créer un dossier pour un article "Hands-on", "Vécu", "Tutoriel" et non une simple news.
On veut du CONCRET : Comment ça marche ? Quels sont les pièges ? Que disent les vrais utilisateurs ?

🔍 RECHERCHE SPÉCIFIQUE À MENER :
1. TUTORIELS & DOCS : Cherche la documentation officielle, des guides "Getting Started", des vidéos YouTube explicatives.
2. AVIS COMMUNAUTAIRES (Reddit, X, Hacker News) : Cherche ce que les devs/fondateurs en disent VRAIMENT. Pas le marketing, mais la réalité (bugs, pricing caché, DX).
3. ALTERNATIVES : Quels sont les vrais concurrents ? Pourquoi choisir celui-ci ?
4. CAS D'USAGE : Qui l'utilise en prod ? Pour faire quoi ?

FORMAT JSON ATTENDU :
{
  "dossierEditorial": {
    "sujet": "${topic.titre}",
    "angleEditorial": "Guide pratique et critique",
    "questionsCentrales": ["Comment l'installer ?", "Est-ce ready for prod ?", "Le pricing est-il viable ?"],
    "sourcesComplementaires": [
      {
        "titre": "Titre (Reddit/Doc/Blog)",
        "url": "URL",
        "typeSource": "forum/doc/tuto",
        "extraits": "Avis clé ou étape technique importante"
      }
    ],
    "tutoriel": {
      "etapes_cles": ["Étape 1", "Étape 2", "Étape 3"],
      "pre_requis": "Ce qu'il faut savoir avant",
      "code_snippets_possibles": "Idées de bouts de code à montrer"
    },
    "avisCommunautaires": [
      {"source": "Reddit r/webdev", "avis": "Positif/Négatif", "citation": "Ce que l'utilisateur a dit", "auteur": "pseudo"}
    ],
    "analyseConcurrentielle": {
      "concurrents": [{"nom": "Alt 1", "pourquoi_moins_bien": "..."}],
      "verdict": "Quand utiliser l'un ou l'autre"
    },
    "syntheseRecherche": {
      "hook_principal": "L'accroche technique/business",
      "message_cle": "Le conseil final de l'expert"
    }
  }
}

EXIGENCES:
- Va chercher sur des forums (ajoute "site:reddit.com" ou "site:twitter.com" dans tes requêtes internes si possible).
- Rapporte des faits techniques précis.
- JSON VALIDE UNIQUEMENT.
`;
  }

  /**
   * Enrich topic with deep research
   */
  async enrichTopic(topic) {
    logger.info('🔬 Researcher Agent: Enriching topic with Perplexity research...');
    logger.info(`Topic: ${topic.titre}`);

    try {
      const prompt = this.buildResearchPrompt(topic);
      
      logger.info('Calling Perplexity API for topic enrichment...');
      // Utilisation de perplexitySearch (texte) au lieu de JSON pour gérer le parsing nous-mêmes
      const result = await perplexitySearch(prompt, {
        temperature: 0.2, 
        maxTokens: 8000,
        model: 'sonar-pro', 
        systemPrompt: 'You are an expert researcher assistant. You ALWAYS return valid JSON based on real web search results.'
      });

      // Tentative de parsing JSON robuste
      let dossier;
      const raw = (result.content || '').trim();

      // Util: nettoyage de contenu JSON approximatif
      const sanitizeJsonLike = (text) => {
        let s = text.trim();
        // Retirer fences ```json ... ```
        s = s.replace(/```json\n([\s\S]*?)\n```/gi, '$1');
        s = s.replace(/```\n([\s\S]*?)\n```/g, '$1');
        // Extraire du premier '{' au dernier '}'
        const first = s.indexOf('{');
        const last = s.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
          s = s.substring(first, last + 1);
        }
        // Normaliser guillemets “ ” ‘ ’ en " et '
        s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        // Supprimer virgules traînantes avant } ou ]
        s = s.replace(/,\s*([}\]])/g, '$1');
        return s.trim();
      };

      try {
        dossier = JSON.parse(raw);
      } catch {
        try {
          const cleaned = sanitizeJsonLike(raw);
          dossier = JSON.parse(cleaned);
        } catch (e2) {
          logger.warn('JSON parse failed, attempting repair with Gemini...');
          
          // Dernier recours: demander à Gemini de normaliser en JSON strict
          const repairPrompt = `Voici un contenu renvoyé par un outil de recherche qui DOIT être un JSON strict au format suivant (schéma simplifié):\n\n{
  "dossierEditorial": {
    "sujet": "string",
    "angleEditorial": "string",
    "questionsCentrales": ["string"],
    "sourcesComplementaires": [{"titre":"string","url":"string","date":"string","typeSource":"string","extraits":"string"}],
    "donneesChiffrees": {"montants": ["string"], "pourcentages": ["string"], "previsions": ["string"], "statistiques": ["string"]},
    "citationsExperts": [{"auteur":"string","fonction":"string","entreprise":"string","citation":"string","source":"string"}],
    "contexteHistorique": {"timeline": ["string"], "precedents": "string", "evolution": "string"},
    "comparaisonsInternationales": {"usa":"string","europe":"string","asie":"string","differences":"string"},
    "analyseConcurrentielle": {"concurrents": [{"nom":"string","partMarche":"string","positionnement":"string","forces":"string","faiblesses":"string"}], "dynamiqueMarche":"string"},
    "enjeuxControverses": {"defis":["string"], "critiques":["string"], "risques":["string"], "debats":"string"},
    "analogiesMetaphores": [{"concept":"string","analogie":"string","explication":"string"}],
    "successStories": [{"entreprise":"string","secteur":"string","situation_avant":"string","solution_adoptee":"string","resultats_apres":"string","citation_dirigeant":"string"}],
    "opportunitesBusinessLecteurs": {"pourquoi_agir_maintenant":"string","actions_concretes":["string"],"investissements_surveiller":["string"],"tendances_suivre":["string"],"premier_pas":"string"},
    "perspectivesFutur": {"vision_enthousiasmante":"string","opportunites_emergentes":["string"],"conseil_final":"string"},
    "syntheseRecherche": {"hook_principal":"string","message_cle":"string","appel_action":"string"}
  }
}\n\nTransforme STRICTEMENT le contenu suivant en JSON VALIDE qui respecte ce schéma. Ne renvoie QUE le JSON, sans texte additionnel.\n\n=== CONTENU A NORMALISER ===\n${raw}\n============================`;

          const repaired = await geminiCompleteJSON(repairPrompt, {
            temperature: 0,
            systemPrompt: 'You convert imperfect text into strict JSON matching the described schema. Return only JSON.',
          });

          if (!repaired?.data) {
            const head = raw.slice(0, 200);
            const tail = raw.slice(-200);
            logger.warn('JSON repair failed. Raw head/tail:', { head, tail });
            throw new Error('Research returned non-JSON content and repair failed');
          }

          dossier = repaired.data;
          logger.success('JSON successfully repaired by Gemini');
        }
      }
      
      // Merge dossier with original topic
      const enrichedTopic = {
        ...topic,
        ...dossier.dossierEditorial,
        // Combiner les sources originales avec les nouvelles
        sources: [
          ...(topic.sources || []),
          ...(dossier.dossierEditorial?.sourcesComplementaires || [])
        ],
        // Marquer comme enrichi
        enriched: true,
        researchTokens: result.usage?.total_tokens,
      };

      logger.success(`✅ Topic enriched with ${dossier.dossierEditorial?.sourcesComplementaires?.length || 0} additional sources`);
      logger.info(`Total sources: ${enrichedTopic.sources.length}`);
      logger.info(`Citations: ${enrichedTopic.citationsExperts?.length || 0}`);

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
