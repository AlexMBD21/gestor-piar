const { createClient } = require('@supabase/supabase-js');

// Let's load the env vars from .env file or define them.
// Let's search for .env in the project.
const url = 'https://zshyltqskjbrdggrypbe.supabase.co'; // We can get this from environment or search the workspace.
// Let's read the .env file in the workspace
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const matchUrl = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
  const matchKey = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
  if (matchUrl) supabaseUrl = matchUrl[1].trim().replace(/['"]/g, '');
  if (matchKey) supabaseKey = matchKey[1].trim().replace(/['"]/g, '');
} catch (e) {
  console.error("Could not read .env file", e);
}

if (!supabaseUrl || !supabaseKey) {
  console.log("Supabase URL or Key not found in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log("PROFILES:");
    console.log(JSON.stringify(profiles, null, 2));
  }

  const { data: piars, error: err2 } = await supabase.from('piars').select('id, nombre, owner_id').limit(5);
  if (err2) {
    console.error("Error fetching piars:", err2);
  } else {
    console.log("PIARS:");
    console.log(JSON.stringify(piars, null, 2));
  }
}

run();
