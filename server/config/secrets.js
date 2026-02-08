const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    if (IS_PRODUCTION) {
        console.error('FATAL ERROR: JWT_SECRET is required in production!');
        process.exit(1);
    } else {
        console.warn('WARNING: JWT_SECRET not set. Using insecure dev fallback.');
        JWT_SECRET = 'dev-insecure-secret-placeholder';
    }
}

export { JWT_SECRET };
