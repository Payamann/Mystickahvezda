import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let JWT_SECRET = process.env.JWT_SECRET;

if (IS_PRODUCTION && !JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET is required in production!');
    process.exit(1);
}

if (!JWT_SECRET) {
    console.warn('⚠️ Development mode: Using temporary insecure secret. DO NOT USE IN PRODUCTION.');
    JWT_SECRET = 'dev-insecure-secret-placeholder';
}

export { JWT_SECRET };
