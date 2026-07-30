import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlpmecutbzkergokuhfi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscG1lY3V0YnprZXJnb2t1aGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjUwMDAsImV4cCI6MjEwMDEwMTAwMH0.7XQb2kcvjYQym3z1D4cZa7Kzg4vxcy1OJEH_EOTd7hw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const newProducts = [
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
    name: 'Iced Lemon Tea',
    category: 'Tea',
    price: 110,
    emoji: '🍋',
    image_url: '/images/product-iced-lemon.png',
    description: 'Refreshing iced tea with a tangy lemon twist.',
    is_available: true
  },
  {
    name: 'Iced Cold Brew',
    category: 'Coffee',
    price: 145,
    emoji: '🧋',
    image_url: '/images/product-iced-dark-coffee.png',
    description: 'Smooth cold brew steeped overnight, served over ice.',
    is_available: true
  },
  {
    name: 'Mojito Cooler',
    category: 'Specialty',
    price: 120,
    emoji: '🍸',
    image_url: '/images/product-mojito.png',
    description: 'Sparkling mint and lime cooler, perfectly refreshing.',
    is_available: true
  },
  {
    name: 'Mango Juice',
    category: 'Specialty',
    price: 100,
    emoji: '🥭',
    image_url: '/images/product-mango-juice.png',
    description: 'Fresh squeezed mango juice, sweet and tropical.',
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
