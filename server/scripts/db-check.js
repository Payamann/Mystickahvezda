
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials in .env');
    console.log('URL:', supabaseUrl);
    console.log('KEY:', supabaseKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function diagnose() {
    console.log('🔍 Starting Database Diagnosis...');
    console.log('Using URL:', supabaseUrl);

    // 1. Check Public Users
    console.log('\n--- Checking public.users ---');
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*, subscriptions(*)');

    if (userError) {
        console.error('❌ Failed to read public.users:', userError);
    } else {
        console.log(`✅ Found ${users.length} users in public.users.`);
        users.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}`));
    }

    // 2. Try to "Fix" the user if missing (JIT repair script)
    // This is essentially running the same logic as the SQL script but from Node
    // to verify if our Service Key has permission to write.

    // We can't access auth.users directly via Client (it's restricted even for Service Role in some contexts via Client SDK, usually need SQL/Admin),
    // but we can try to Insert a dummy or check specific known email if provided.

    // 3. Check App Logs (Trigger Debugging)
    console.log('\n--- Checking public.app_logs ---');
    const { data: logs, error: logError } = await supabase
        .from('app_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (logError) {
        console.error('❌ Failed to read app_logs:', logError); // Might fail if table doesn't exist
    } else {
        console.log(`✅ Found ${logs.length} log entries.`);
        logs.forEach(l => console.log(` [${l.created_at}] ${l.event}: ${l.message} ${l.details || ''}`));
    }

    console.log('\n--- Diagnosis Complete ---');
}

diagnose();
