import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Construct the URL if only ID is provided, or use full URL
const projectUrl = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('http')
    ? `https://${process.env.SUPABASE_URL}.supabase.co`
    : process.env.SUPABASE_URL;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

import fs from 'fs';

// Warn but don't crash yet (keys might be added later)
if (!projectUrl || !serviceKey) {
    console.warn('⚠️ WARNING: Supabase credentials missing in .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
} else {
    console.log('✅ Supabase initialized.');
}

// Create Supabase client
// We use the SERVICE_ROLE_KEY because this runs on the server and needs admin rights (bypass RLS)
export const supabase = createClient(projectUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
