#!/usr/bin/env node

/**
 * Script de test de connexion Reve.com
 * Vérifie que votre clé API fonctionne et génère une image de test
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '.env') });

console.log('🎨 Test de connexion Reve.com\n');
console.log('═'.repeat(60));

// Vérifier que la clé API existe
if (!process.env.REVE_API_KEY) {
  console.error('\n❌ ERREUR : REVE_API_KEY non trouvée');
  console.error('\n📝 Étapes à suivre :');
  console.error('1. Ajoutez votre clé API dans le fichier .env');
  console.error('2. REVE_API_KEY=votre_cle_api_ici');
  console.error('3. Relancez ce script : node test-reve.js\n');
  process.exit(1);
}

console.log('✅ Clé API trouvée dans .env');
console.log(`   Clé : ${process.env.REVE_API_KEY.substring(0, 20)}...`);

async function testReveAPI() {
  console.log('\n📡 Test : Génération d\'une image de test...');
  
  const apiUrl = 'https://api.reve.com/v1/image/create';
  const testPrompt = 'A beautiful sunset over mountains, minimalistic flat design with soft pastel gradients, clean composition, modern digital illustration style';

  console.log(`   URL : ${apiUrl}`);
  console.log(`   Prompt : ${testPrompt.substring(0, 80)}...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVE_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: testPrompt,
      }),
    });

    console.log(`\n📊 Réponse HTTP : ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Erreur de l\'API Reve.com');
      console.error(`   Code : ${response.status}`);
      console.error(`   Message : ${errorText}`);
      
      if (response.status === 401) {
        console.error('\n💡 Solution : Vérifiez que votre clé API est correcte');
        console.error('   Format attendu : papi.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.-xxxxx');
      } else if (response.status === 429) {
        console.error('\n💡 Solution : Vous avez atteint la limite de requêtes');
        console.error('   Attendez quelques minutes avant de réessayer');
      } else if (response.status === 402) {
        console.error('\n💡 Solution : Crédit insuffisant sur votre compte Reve.com');
        console.error('   Ajoutez du crédit sur : https://app.reve.com/billing');
      }
      
      return false;
    }

    const data = await response.json();
    console.log('\n✅ Image générée avec succès !');
    
    console.log('\n📊 Informations :');
    console.log(`   Request ID : ${data.request_id}`);
    console.log(`   Crédits utilisés : ${data.credits_used}`);
    console.log(`   Crédits restants : ${data.credits_remaining}`);
    console.log(`   Version : ${data.version}`);
    
    if (data.content_violation) {
      console.log('\n⚠️  Violation de contenu détectée !');
    }

    if (data.image) {
      const imageLength = data.image.length;
      const imageSizeKB = Math.round((imageLength * 3) / 4 / 1024);
      console.log('\n🖼️  Image base64 reçue :');
      console.log(`   Taille : ~${imageSizeKB} KB`);
      console.log(`   Préfixe : ${data.image.substring(0, 50)}...`);
      console.log('\n✅ L\'image est prête à être sauvegardée !');
    } else {
      console.log('\n❌ Pas de données d\'image dans la réponse');
      console.log('\n📦 Réponse complète :');
      console.log(JSON.stringify(data, null, 2));
    }

    return true;
  } catch (error) {
    console.error('\n❌ Erreur lors de la requête');
    console.error(`   Message : ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Solution : Vérifiez votre connexion internet');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Solution : La requête a expiré, réessayez');
    }
    
    return false;
  }
}

// Exécuter le test
async function runTest() {
  console.log('\n🚀 Démarrage du test...\n');
  
  const success = await testReveAPI();

  console.log('\n' + '═'.repeat(60));
  
  if (success) {
    console.log('\n✅ TEST RÉUSSI !');
    console.log('\n📝 Prochaines étapes :');
    console.log('   1. L\'API Reve.com fonctionne correctement');
    console.log('   2. Vous pouvez lancer le pipeline complet : npm run full-pipeline');
    console.log('   3. Les thumbnails seront générés automatiquement');
  } else {
    console.log('\n❌ TEST ÉCHOUÉ');
    console.log('   Corrigez les erreurs ci-dessus avant de continuer');
  }

  console.log('\n');
}

// Lancer le test
runTest().catch(error => {
  console.error('\n❌ Erreur inattendue :', error);
  process.exit(1);
});
