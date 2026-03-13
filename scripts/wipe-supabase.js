
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  console.log('🚮 NUCLEAR WIPE v4 (Supabase JS) 🚮');

  const tables = [
    'poi_visits',
    'user_unlocks',
    'user_route_progress',
    'route_pois',
    'pois',
    'routes',
    'user_telemetry'
  ];

  for (const table of tables) {
    console.log(`Clearing table: ${table}`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`⚠️ Error clearing ${table}:`, error.message);
    } else {
      console.log(`✅ ${table} cleared.`);
    }
  }

  console.log('🏁 Nuclear wipe complete.');
}

wipe();
