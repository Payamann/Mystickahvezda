import { supabase } from '../db-supabase.js';

async function verify() {
    console.log("🔍 Verifying Database Content...");

    // 1. Check User
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', process.env.VERIFY_EMAIL || 'test@example.com')
        .single();

    if (user) {
        console.log(`✅ User Found: ${user.email} (ID: ${user.id})`);
    } else {
        console.error(`❌ User verification failed: ${userError?.message}`);
    }

    if (user) {
        // 2. Check Readings (Horoscope/Tarot/Compat/Ball)
        const { data: readings, error: readingError } = await supabase
            .from('user_readings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        console.log(`\n📚 Recent Readings for User (Last 5):`);
        if (readings && readings.length > 0) {
            readings.forEach(r => console.log(`   - [${r.type}] ${r.created_at}`));
        } else {
            console.log("   (No readings found)");
        }

        // 3. Check Mentor Messages
        const { data: messages, error: msgError } = await supabase
            .from('mentor_messages')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        console.log(`\n💬 Recent Mentor Messages (Last 5):`);
        if (messages && messages.length > 0) {
            messages.forEach(m => console.log(`   - [${m.role}] ${m.content.substring(0, 50)}...`));
        } else {
            console.log("   (No messages found)");
        }
    }

    console.log("\nDone.");
    process.exit(0);
}

verify();
