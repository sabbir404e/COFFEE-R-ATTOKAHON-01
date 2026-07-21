import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tlpmecutbzkergokuhfi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscG1lY3V0YnprZXJnb2t1aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjUwMDAsImV4cCI6MjEwMDEwMTAwMH0.7XQb2kcvjYQym3z1D4cZa7Kzg4vxcy1OJEH_EOTd7hw'
);

const users = [
  { username: 'admin',  password: 'admin123',  role: 'admin'   },
  { username: 'chief',  password: 'chief123',  role: 'kitchen' },
];

for (const user of users) {
  // Check if already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', user.username)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('users')
      .update({ password: user.password, role: user.role })
      .eq('username', user.username);

    if (error) {
      console.error(`❌ Failed to update ${user.username}:`, error.message);
    } else {
      console.log(`✅ Updated: ${user.username} (${user.role})`);
    }
  } else {
    // Insert new
    const { error } = await supabase
      .from('users')
      .insert(user);

    if (error) {
      console.error(`❌ Failed to insert ${user.username}:`, error.message);
    } else {
      console.log(`✅ Inserted: ${user.username} (${user.role})`);
    }
  }
}

console.log('\nDone! Check your Supabase users table.');
