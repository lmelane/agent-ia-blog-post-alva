# Guide OpenAI Deep Research

Ce document explique comment utiliser l'API OpenAI Deep Research dans ce projet.

## 📖 Qu'est-ce que Deep Research ?

Deep Research est une fonctionnalité d'OpenAI qui permet aux modèles d'effectuer des recherches web approfondies et de synthétiser des informations provenant de multiples sources en ligne.

### Modèles disponibles

- **o3-deep-research** : Le plus puissant, meilleure qualité de recherche
- **o4-mini-deep-research** : Plus rapide et économique, excellent rapport qualité/prix

## 🔧 Configuration

### Dans ce projet

Le client OpenAI est configuré dans `src/utils/openai-client.js` :

```javascript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Fonction Deep Research
export async function deepResearch(prompt, options = {}) {
  const response = await openai.chat.completions.create({
    model: config.openai.deepResearchModel, // o4-mini-deep-research
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,
  });
  
  return response;
}
```

### Activation du Web Search

Les modèles Deep Research activent automatiquement la recherche web. Vous n'avez pas besoin de paramètres supplémentaires.

## 💡 Bonnes Pratiques

### 1. Structurer vos prompts

Pour obtenir les meilleurs résultats avec Deep Research :

```javascript
const prompt = `
MISSION: Research and identify trending AI topics from the last 72 hours.

CRITERIA:
1. Published within the last 72 hours ONLY
2. High impact (product launches, breakthroughs, funding)
3. Multiple credible sources
4. Business/tech relevance

REQUIRED OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "topics": [
    {
      "titre": "...",
      "resume": "...",
      "sources": [...]
    }
  ]
}

IMPORTANT:
- Filter out anything older than 72 hours
- Include specific data points and metrics
- Cite all sources with URLs and dates
`;
```

**Points clés** :
- ✅ Définissez clairement la mission
- ✅ Spécifiez les critères de recherche
- ✅ Demandez un format de sortie structuré
- ✅ Incluez des contraintes temporelles
- ✅ Demandez des sources citées

### 2. Utiliser JSON Mode

Pour obtenir des réponses structurées :

```javascript
export async function completeJSON(prompt, options = {}) {
  const response = await openai.chat.completions.create({
    model: config.openai.standardModel,
    messages: [
      {
        role: 'system',
        content: 'You are an AI research assistant that returns structured JSON data.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 3. Gérer les sources

Deep Research inclut automatiquement des sources dans ses réponses. Pour les extraire :

```javascript
// Le modèle inclura naturellement des URLs dans sa réponse
// Exemple de parsing :
const urlPattern = /https?:\/\/[^\s\)]+/g;
const urls = content.match(urlPattern) || [];
```

### 4. Optimiser les coûts

**Stratégies d'optimisation** :

1. **Utilisez o4-mini-deep-research** pour la plupart des cas
   - 60% moins cher que o3-deep-research
   - Qualité suffisante pour la veille quotidienne

2. **Limitez max_tokens**
   ```javascript
   maxTokens: 4000 // Suffisant pour 5-10 topics
   ```

3. **Cachez les résultats**
   ```javascript
   // Sauvegardez les résultats pour éviter de re-rechercher
   await fileManager.saveScoutResults(topics);
   ```

4. **Utilisez des modèles standards pour les tâches simples**
   ```javascript
   // Deep Research pour la veille
   const topics = await deepResearch(scoutPrompt);
   
   // GPT-4o pour la rédaction (moins cher)
   const article = await complete(writePrompt);
   ```

## 📊 Exemples d'Utilisation

### Exemple 1 : Veille d'actualités

```javascript
const prompt = `
Research the latest AI news from the past 72 hours.
Focus on: product launches, research breakthroughs, funding rounds.

Return JSON with:
- title
- summary
- impact
- sources (with URLs and dates)
- category (Technology, Business, Economy, etc.)
`;

const result = await deepResearch(prompt);
```

### Exemple 2 : Analyse comparative

```javascript
const prompt = `
Compare the latest LLM releases from OpenAI, Anthropic, and Google.
Focus on: capabilities, pricing, availability, performance benchmarks.

Include sources for all claims.
`;

const result = await deepResearch(prompt);
```

### Exemple 3 : Recherche thématique

```javascript
const prompt = `
Research AI regulations and policies announced in the last week.
Focus on: EU AI Act, US executive orders, industry guidelines.

For each regulation:
- What changed
- Who is affected
- Implementation timeline
- Sources with dates
`;

const result = await deepResearch(prompt);
```

## 🎯 Cas d'Usage dans ce Projet

### Scout Agent

Le Scout utilise Deep Research pour :
- Découvrir les actualités IA récentes (≤72h)
- Identifier les sources crédibles
- Catégoriser automatiquement les sujets
- Extraire les métadonnées (dates, impact, keywords)

**Prompt type** :
```javascript
buildResearchPrompt() {
  return `
  You are an AI research scout specialized in finding hot AI news from the last 72 hours.
  
  MISSION: Research and identify 5-10 trending AI topics published within the last 72 hours (≤ 72h).
  
  CATEGORIZATION:
  Assign each topic to ONE of these 7 categories:
  - Entreprise, Technologie, Économie, Marketing, Santé, Culture, Carrière
  
  REQUIRED JSON FORMAT:
  {
    "topics": [
      {
        "titre": "...",
        "resume": "...",
        "impact": "...",
        "categorie": "...",
        "sources": [...],
        "keywords": [...],
        "publishDate": "..."
      }
    ]
  }
  `;
}
```

## ⚠️ Limitations et Considérations

### Limitations

1. **Fraîcheur des données**
   - Les résultats peuvent avoir quelques heures de retard
   - Pas de données en temps réel

2. **Coût**
   - Deep Research est plus coûteux que les requêtes standards
   - Optimisez vos prompts pour réduire les tokens

3. **Rate Limits**
   - Respectez les limites de l'API OpenAI
   - Implémentez des retry avec backoff si nécessaire

### Bonnes Pratiques

1. **Validez toujours les résultats**
   ```javascript
   // Vérifiez la fraîcheur
   if (!this.isTopicFresh(topic.publishDate)) {
     logger.warn(`Topic too old: ${topic.titre}`);
     continue;
   }
   
   // Vérifiez les sources
   if (!topic.sources || topic.sources.length === 0) {
     logger.warn(`No sources for: ${topic.titre}`);
     continue;
   }
   ```

2. **Gérez les erreurs gracieusement**
   ```javascript
   try {
     const result = await deepResearch(prompt);
   } catch (error) {
     if (error.code === 'rate_limit_exceeded') {
       // Attendez et réessayez
       await sleep(60000);
       return await deepResearch(prompt);
     }
     throw error;
   }
   ```

3. **Loggez tout**
   ```javascript
   logger.info('Deep Research completed', {
     model: result.model,
     tokensUsed: result.usage?.total_tokens,
     topicsFound: topics.length,
   });
   ```

## 📈 Monitoring et Optimisation

### Métriques à surveiller

1. **Coût par article**
   - Tokens utilisés par le Scout
   - Tokens utilisés par le Writer
   - Coût total par jour

2. **Qualité des résultats**
   - Nombre de topics découverts
   - Taux de topics passant le seuil
   - Pertinence des sources

3. **Performance**
   - Temps d'exécution du Scout
   - Temps total du pipeline

### Optimisations possibles

1. **Cachez les résultats intermédiaires**
   ```javascript
   // Évitez de re-rechercher les mêmes sujets
   const cached = await fileManager.loadScoutResults(date);
   if (cached) return cached;
   ```

2. **Batch les requêtes**
   ```javascript
   // Au lieu de 7 requêtes (une par jour)
   // Faites 1 requête pour toute la semaine
   ```

3. **Utilisez des fallbacks**
   ```javascript
   // Si Deep Research échoue, utilisez un modèle standard
   try {
     return await deepResearch(prompt);
   } catch (error) {
     logger.warn('Deep Research failed, using standard model');
     return await complete(prompt);
   }
   ```

## 🔗 Ressources

- [OpenAI Deep Research Documentation](https://platform.openai.com/docs/guides/deep-research)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OpenAI Pricing](https://openai.com/pricing)
- [Best Practices for Prompting](https://platform.openai.com/docs/guides/prompt-engineering)
