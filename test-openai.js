#!/usr/bin/env node

/**
 * Script de test de connexion OpenAI
 * Vérifie que votre clé API fonctionne et que vous avez accès aux modèles nécessaires
 */

import dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Test de connexion OpenAI\n');
console.log('═'.repeat(60));

// Vérifier que la clé API existe
if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ ERREUR : OPENAI_API_KEY non trouvée');
  console.error('\n📝 Étapes à suivre :');
  console.error('1. Créez le fichier .env : cp .env.example .env');
  console.error('2. Éditez .env et ajoutez votre clé API OpenAI');
  console.error('3. Relancez ce script : node test-openai.js\n');
  process.exit(1);
}

console.log('✅ Clé API trouvée dans .env');
console.log(`   Clé : ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);

// Créer le client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testConnection() {
  console.log('\n📡 Test 1 : Connexion à l\'API OpenAI...');
  
  try {
    // Test simple avec GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: 'Réponds simplement "OK" si tu me reçois.',
        },
      ],
      max_tokens: 10,
    });

    console.log('✅ Connexion réussie !');
    console.log(`   Modèle utilisé : ${response.model}`);
    console.log(`   Réponse : ${response.choices[0].message.content}`);
    console.log(`   Tokens utilisés : ${response.usage.total_tokens}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion');
    console.error(`   Code : ${error.code || 'N/A'}`);
    console.error(`   Message : ${error.message}`);
    
    if (error.code === 'invalid_api_key') {
      console.error('\n💡 Solution : Vérifiez que votre clé API est correcte');
      console.error('   Obtenez votre clé sur : https://platform.openai.com/api-keys');
    } else if (error.code === 'insufficient_quota') {
      console.error('\n💡 Solution : Votre compte OpenAI n\'a plus de crédit');
      console.error('   Ajoutez du crédit sur : https://platform.openai.com/account/billing');
    }
    
    return false;
  }
}

async function testDeepResearchModel() {
  console.log('\n📡 Test 2 : Accès au modèle Deep Research...');
  
  const deepResearchModel = process.env.DEEP_RESEARCH_MODEL || 'o4-mini-deep-research';
  console.log(`   Modèle à tester : ${deepResearchModel}`);
  
  try {
    const response = await openai.chat.completions.create({
      model: deepResearchModel,
      messages: [
        {
          role: 'user',
          content: 'Test de connexion. Réponds simplement "OK".',
        },
      ],
      max_tokens: 10,
    });

    console.log('✅ Accès au Deep Research confirmé !');
    console.log(`   Modèle : ${response.model}`);
    console.log(`   Réponse : ${response.choices[0].message.content}`);
    console.log(`   Tokens utilisés : ${response.usage.total_tokens}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur d\'accès au Deep Research');
    console.error(`   Code : ${error.code || 'N/A'}`);
    console.error(`   Message : ${error.message}`);
    
    if (error.code === 'model_not_found' || error.message.includes('does not exist')) {
      console.error('\n💡 Solution : Vous n\'avez pas accès aux modèles Deep Research');
      console.error('   Options :');
      console.error('   1. Utilisez gpt-4o à la place (modifiez DEEP_RESEARCH_MODEL dans .env)');
      console.error('   2. Contactez OpenAI pour obtenir l\'accès aux modèles Deep Research');
      console.error('   3. Attendez que les modèles Deep Research soient disponibles publiquement');
    }
    
    return false;
  }
}

async function testJSONMode() {
  console.log('\n📡 Test 3 : Mode JSON...');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You return JSON data.',
        },
        {
          role: 'user',
          content: 'Return a JSON object with a "status" field set to "ok".',
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
    });

    const data = JSON.parse(response.choices[0].message.content);
    console.log('✅ Mode JSON fonctionnel !');
    console.log(`   Réponse JSON : ${JSON.stringify(data)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur du mode JSON');
    console.error(`   Message : ${error.message}`);
    return false;
  }
}

async function testModels() {
  console.log('\n📡 Test 4 : Liste des modèles disponibles...');
  
  try {
    const models = await openai.models.list();
    const relevantModels = models.data
      .filter(m => 
        m.id.includes('gpt-4') || 
        m.id.includes('o3') || 
        m.id.includes('o4')
      )
      .map(m => m.id)
      .sort();

    console.log('✅ Modèles disponibles :');
    relevantModels.forEach(model => {
      console.log(`   - ${model}`);
    });
    
    // Vérifier si Deep Research est disponible
    const hasDeepResearch = relevantModels.some(m => 
      m.includes('deep-research') || 
      m.includes('o3') || 
      m.includes('o4')
    );
    
    if (hasDeepResearch) {
      console.log('\n✅ Vous avez accès aux modèles Deep Research !');
    } else {
      console.log('\n⚠️  Aucun modèle Deep Research détecté');
      console.log('   Vous pouvez utiliser gpt-4o à la place');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des modèles');
    console.error(`   Message : ${error.message}`);
    return false;
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('\n🚀 Démarrage des tests...\n');
  
  const results = {
    connection: false,
    deepResearch: false,
    jsonMode: false,
    models: false,
  };

  // Test 1 : Connexion de base
  results.connection = await testConnection();
  
  if (!results.connection) {
    console.log('\n❌ Test de connexion échoué. Arrêt des tests.');
    console.log('\n💡 Corrigez votre clé API avant de continuer.\n');
    process.exit(1);
  }

  // Test 2 : Deep Research
  results.deepResearch = await testDeepResearchModel();

  // Test 3 : JSON Mode
  results.jsonMode = await testJSONMode();

  // Test 4 : Liste des modèles
  results.models = await testModels();

  // Résumé
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS\n');
  console.log(`✅ Connexion OpenAI      : ${results.connection ? 'OK' : 'ÉCHEC'}`);
  console.log(`${results.deepResearch ? '✅' : '⚠️ '} Deep Research         : ${results.deepResearch ? 'OK' : 'NON DISPONIBLE'}`);
  console.log(`✅ Mode JSON             : ${results.jsonMode ? 'OK' : 'ÉCHEC'}`);
  console.log(`✅ Liste des modèles     : ${results.models ? 'OK' : 'ÉCHEC'}`);

  console.log('\n' + '═'.repeat(60));

  if (results.connection && results.jsonMode) {
    console.log('\n✅ TOUT EST PRÊT !');
    console.log('\n📝 Prochaines étapes :');
    console.log('   1. Lancez le pipeline complet : npm run full-pipeline');
    console.log('   2. Ou testez étape par étape :');
    console.log('      - npm run scout  (veille)');
    console.log('      - npm run rank   (scoring)');
    console.log('      - npm run write  (rédaction)');
    
    if (!results.deepResearch) {
      console.log('\n⚠️  ATTENTION : Deep Research non disponible');
      console.log('   Solution : Modifiez .env pour utiliser gpt-4o :');
      console.log('   DEEP_RESEARCH_MODEL=gpt-4o');
    }
  } else {
    console.log('\n❌ CONFIGURATION INCOMPLÈTE');
    console.log('   Corrigez les erreurs ci-dessus avant de continuer.');
  }

  console.log('\n');
}

// Lancer les tests
runAllTests().catch(error => {
  console.error('\n❌ Erreur inattendue :', error);
  process.exit(1);
});
