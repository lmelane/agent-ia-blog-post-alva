import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/utils/database.js';
import logger from './src/utils/logger.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  logger.info('🔌 Initializing Database...');
  logger.info(`URL: ${process.env.DATABASE_URL ? 'Defined' : 'Missing'}`);
  
  try {
    await initDatabase();
    logger.success('Database initialization successful!');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();
