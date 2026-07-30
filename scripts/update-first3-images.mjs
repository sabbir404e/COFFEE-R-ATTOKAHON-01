import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlpmecutbzkergokuhfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscG1lY3V0YnprZXJnb2t1aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjUwMDAsImV4cCI6MjEwMDEwMTAwMH0.7XQb2kcvjYQym3z1D4cZa7Kzg4vxcy1OJEH_EOTd7hw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Replace images for first 3 products (id: 1, 2, 3)
const updates = [
  { id: 1, image_url: '/images/product-espresso.png' },
  { id: 2, image_url: '/images/product-latte.png' },
  { id: 3, image_url: '/images/product-coffee-glass.png' },
];

async function run() {
  for (const update of updates) {
    const { error } = await supabase
      .from('products')
      .update({ image_url: update.image_url })
      .eq('id', update.id);

    if (error) {
      console.error(`Failed to update product id=${update.id}:`, error.message);
    } else {
      console.log(`✓ Updated product id=${update.id} → ${update.image_url}`);
    }
  }

  // Show updated products
  const { data: all } = await supabase
    .from('products')
    .select('id, name, image_url')
    .in('id', [1, 2, 3]);
  console.log('\nUpdated products:');
  all?.forEach(p => console.log(`  [${p.id}] ${p.name} → ${p.image_url}`));
}

run();
