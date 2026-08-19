/**
 * Helper utility to dynamically resolve product images across the application.
 * Supports direct URLs, product catalogue lookup, and fallback matching to local bundled assets.
 */

const KEYWORD_IMAGE_MAP = [
  { keywords: ['special latte', 'signature latte', 'spanish latte'], img: '/images/product-special-latte.png' },
  { keywords: ['caramel latte', 'vanilla latte', 'hazelnut latte', 'latte', 'cafe latte'], img: '/images/product-latte.png' },
  { keywords: ['iced dark coffee', 'iced americano', 'iced black'], img: '/images/product-iced-dark-coffee.png' },
  { keywords: ['iced coffee', 'cold coffee', 'frappe', 'cold brew', 'iced cappuccino'], img: '/images/product-iced-coffee.png' },
  { keywords: ['coffee glass', 'glass coffee'], img: '/images/product-coffee-glass.png' },
  { keywords: ['dark coffee', 'americano', 'black coffee', 'long black'], img: '/images/product-dark-coffee.png' },
  { keywords: ['espresso', 'doppio', 'ristretto'], img: '/images/product-espresso.png' },
  { keywords: ['cappuccino', 'mocha', 'macchiato', 'flat white', 'coffee'], img: '/images/product-coffee.png' },
  { keywords: ['cheesecake', 'cheese cake', 'cake', 'pastry'], img: '/images/product-cheesecake.png' },
  { keywords: ['club sandwich', 'sandwich tower', 'double sandwich', 'burger'], img: '/images/product-sandwich-tower.png' },
  { keywords: ['sandwich', 'toastie', 'sub'], img: '/images/product-sandwich.png' },
  { keywords: ['green tea', 'matcha', 'jasmine'], img: '/images/product-green-tea.png' },
  { keywords: ['herbal tea', 'chamomile', 'earl grey', 'mint tea'], img: '/images/product-herbal-tea.png' },
  { keywords: ['lemon', 'lemonade', 'citrus', 'iced lemon'], img: '/images/product-iced-lemon.png' },
  { keywords: ['mango', 'mango juice', 'fruit juice', 'juice', 'smoothie'], img: '/images/product-mango-juice.png' },
  { keywords: ['mojito', 'cooler', 'mint mojito'], img: '/images/product-mojito.png' },
  { keywords: ['pancake', 'pancakes', 'waffle', 'waffles', 'crepe'], img: '/images/product-pancakes.png' },
  { keywords: ['muffin', 'cupcake', 'blueberry muffin'], img: '/images/product-muffin.png' },
  { keywords: ['tart', 'fruit tart', 'pie'], img: '/images/product-tart.png' },
  { keywords: ['bun', 'bread', 'croissant', 'toast', 'bakery'], img: '/images/product-bun.png' },
  { keywords: ['egg', 'omelet', 'poached', 'breakfast'], img: '/images/product-egg.png' },
  { keywords: ['hot chocolate', 'chocolate', 'cocoa', 'hot drink'], img: '/images/product-hot-drink.png' },
  { keywords: ['tea', 'chai', 'milk tea', 'black tea', 'red tea'], img: '/images/product-tea.png' },
];

export function resolveProductImage(itemOrProduct, productsList = []) {
  if (!itemOrProduct) return null;

  // 1. Check direct image property if valid
  const directImg = itemOrProduct.image || itemOrProduct.image_url || itemOrProduct.img;
  if (typeof directImg === 'string' && directImg.trim()) {
    return directImg.trim();
  }

  const targetId = itemOrProduct.id || itemOrProduct.productId || itemOrProduct.product_id;
  const rawName = itemOrProduct.name || itemOrProduct.product_name || '';
  // Strip customization details in parentheses if present e.g. "Caramel Latte (Large · 50% sugar)"
  const cleanName = rawName.replace(/\([^)]*\)/g, '').trim().toLowerCase();

  // 2. Search in products catalog
  if (Array.isArray(productsList) && productsList.length > 0) {
    const found = productsList.find(p =>
      (targetId && (p.id === targetId || String(p.id) === String(targetId) || Number(p.id) === Number(targetId))) ||
      (cleanName && p.name && p.name.trim().toLowerCase() === cleanName) ||
      (cleanName && p.name && (p.name.trim().toLowerCase().includes(cleanName) || cleanName.includes(p.name.trim().toLowerCase())))
    );
    if (found) {
      const foundImg = found.image || found.image_url || found.img;
      if (typeof foundImg === 'string' && foundImg.trim()) {
        return foundImg.trim();
      }
    }
  }

  // 3. Fallback matching against bundled asset dictionary
  if (cleanName) {
    for (const mapping of KEYWORD_IMAGE_MAP) {
      if (mapping.keywords.some(kw => cleanName.includes(kw))) {
        return mapping.img;
      }
    }
  }

  return null;
}
