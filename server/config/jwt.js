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

// JWT expiry - configurable via environment variable (default: 7 days)
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Cookie options for HttpOnly JWT storage
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/'
};

// Non-HttpOnly indicator cookie (readable by JS for isLoggedIn check)
const INDICATOR_COOKIE_OPTIONS = {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
};

// Options pro clearCookie — bez maxAge (jinak Node.js varuje "expires immediately")
const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'Strict',
    path: '/'
};

const CLEAR_INDICATOR_COOKIE_OPTIONS = {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'Strict',
    path: '/'
};

export { JWT_SECRET, JWT_EXPIRY, COOKIE_OPTIONS, INDICATOR_COOKIE_OPTIONS, CLEAR_COOKIE_OPTIONS, CLEAR_INDICATOR_COOKIE_OPTIONS };
