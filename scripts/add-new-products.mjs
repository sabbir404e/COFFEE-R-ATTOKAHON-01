import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlpmecutbzkergokuhfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscG1lY3V0YnprZXJnb2t1aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjUwMDAsImV4cCI6MjEwMDEwMTAwMH0.7XQb2kcvjYQym3z1D4cZa7Kzg4vxcy1OJEH_EOTd7hw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Edit names / prices / descriptions below before running ──────────────────
const newProducts = [
  {
    name: 'Espresso',
    category: 'Coffee',
    price: 80,
    emoji: '☕',
    image_url: '/images/product-espresso.png',
    description: 'Rich, bold espresso shot brewed to perfection.',
    is_available: true
  },
  {
    name: 'Café Latte',
    category: 'Coffee',
    price: 120,
    emoji: '☕',
    image_url: '/images/product-latte.png',
    description: 'Smooth espresso with velvety steamed milk.',
    is_available: true
  },
  {
    name: 'Coffee Glass',
    category: 'Coffee',
    price: 110,
    emoji: '🥤',
    image_url: '/images/product-coffee-glass.png',
    description: 'Classic coffee served in a tall warm glass.',
    is_available: true
  },
  {
    name: 'Green Tea',
    category: 'Tea',
    price: 90,
    emoji: '🍵',
    image_url: '/images/product-green-tea.png',
    description: 'Light, fragrant green tea brewed to perfection.',
    is_available: true
  },
  {
    name: 'Hot Chocolate',
    category: 'Specialty',
    price: 110,
    emoji: '🍫',
    image_url: '/images/product-hot-drink.png',
    description: 'Rich, creamy hot chocolate made with real cocoa.',
    is_available: true
  }
];

async function run() {
  const { data: existing } = await supabase.from('products').select('name');
  const existingNames = (existing || []).map(p => p.name.toLowerCase());

  for (const product of newProducts) {
    if (existingNames.includes(product.name.toLowerCase())) {
      console.log(`Skipping "${product.name}" — already exists.`);
      continue;
    }
    const { error } = await supabase.from('products').insert(product);
    if (error) {
      console.error(`Failed to insert "${product.name}":`, error.message);
    } else {
      console.log(`✓ Inserted: ${product.name}`);
    }
  }

  const { data: all } = await supabase.from('products').select('id, name, category, image_url').order('id');
  console.log('\nAll products now in database:');
  all?.forEach(p => console.log(`  [${p.id}] ${p.name} (${p.category}) → ${p.image_url}`));
}

run();
