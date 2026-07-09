'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Espresso', cat: 'Coffee', price: 80, emoji: '☕', desc: 'Rich double shot, bold and intense.', avail: true },
  { id: '2', name: 'Cappuccino', cat: 'Coffee', price: 120, emoji: '🥛', desc: 'Espresso with velvety steamed milk foam.', avail: true },
  { id: '3', name: 'Caramel Latte', cat: 'Coffee', price: 140, emoji: '🍵', desc: 'Smooth latte with house caramel drizzle.', avail: true },
  { id: '4', name: 'Cold Brew', cat: 'Coffee', price: 150, emoji: '🧊', desc: 'Slow-steeped, refreshing cold coffee.', avail: true },
  { id: '5', name: 'Iced Mocha', cat: 'Coffee', price: 155, emoji: '🍫', desc: 'Espresso, chocolate, cold milk over ice.', avail: true },
  { id: '6', name: 'Matcha Latte', cat: 'Specialty', price: 145, emoji: '🍃', desc: 'Ceremonial matcha blended with oat milk.', avail: true },
  { id: '7', name: 'Mango Smoothie', cat: 'Specialty', price: 130, emoji: '🥭', desc: 'Fresh mango blended with yogurt and honey.', avail: true },
  { id: '8', name: 'Croissant', cat: 'Food', price: 100, emoji: '🥐', desc: 'Buttery and flaky, baked fresh every morning.', avail: true },
  { id: '9', name: 'Club Sandwich', cat: 'Food', price: 180, emoji: '🥪', desc: 'Chicken, lettuce, tomato, toasted bread.', avail: true },
  { id: '10', name: 'Blueberry Muffin', cat: 'Food', price: 90, emoji: '🧁', desc: 'Soft muffin loaded with blueberries.', avail: true },
  { id: '11', name: 'Cheesecake', cat: 'Dessert', price: 190, emoji: '🍰', desc: 'New York style with seasonal berry compote.', avail: true },
  { id: '12', name: 'Avocado Toast', cat: 'Food', price: 160, emoji: '🥑', desc: 'Sourdough, smashed avocado, chilli flakes.', avail: true },
];

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', role: 'admin' }
];

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [tableNum, setTableNum] = useState(null);
  const [cart, setCart] = useState({});
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState(null);

  // Safely initialize state from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('ca_theme') || 'dark';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      // Load products
      const savedProds = localStorage.getItem('ca_products');
      if (savedProds) {
        try {
          setProducts(JSON.parse(savedProds));
        } catch (e) {
          localStorage.setItem('ca_products', JSON.stringify(DEFAULT_PRODUCTS));
        }
      } else {
        localStorage.setItem('ca_products', JSON.stringify(DEFAULT_PRODUCTS));
      }

      // Load orders
      const savedOrders = localStorage.getItem('ca_paid_orders');
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (e) {}
      }

      // Load payments
      const savedPayments = localStorage.getItem('ca_payments');
      if (savedPayments) {
        try {
          setPayments(JSON.parse(savedPayments));
        } catch (e) {}
      }

      // Load users
      const savedUsers = localStorage.getItem('ca_users');
      if (savedUsers) {
        try {
          setUsers(JSON.parse(savedUsers));
        } catch (e) {
          localStorage.setItem('ca_users', JSON.stringify(DEFAULT_USERS));
        }
      } else {
        localStorage.setItem('ca_users', JSON.stringify(DEFAULT_USERS));
      }

      // Load pending cart if exists
      const savedCart = localStorage.getItem('ca_pending_cart');
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          // If there is an existing pending cart, set it
          if (parsed && parsed.items) {
            const reconstructedCart = {};
            parsed.items.forEach(item => {
              reconstructedCart[item.id || item.name] = {
                product: { name: item.name, emoji: item.emoji, price: item.price, id: item.id },
                qty: item.qty
              };
            });
            setCart(reconstructedCart);
          }
        } catch (e) {}
      }
    }
  }, []);

  // Listen for changes in localStorage across tabs (important for KDS & Menu updates)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'ca_products') {
        try { setProducts(JSON.parse(e.newValue)); } catch (err) {}
      } else if (e.key === 'ca_paid_orders') {
        try { setOrders(JSON.parse(e.newValue)); } catch (err) {}
      } else if (e.key === 'ca_payments') {
        try { setPayments(JSON.parse(e.newValue)); } catch (err) {}
      } else if (e.key === 'ca_users') {
        try { setUsers(JSON.parse(e.newValue)); } catch (err) {}
      } else if (e.key === 'ca_theme') {
        if (e.newValue) {
          setTheme(e.newValue);
          document.documentElement.setAttribute('data-theme', e.newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Set up a helper interval to sync changes in KDS/menu in the same tab (like the legacy code)
    const interval = setInterval(() => {
      try {
        const freshProds = JSON.parse(localStorage.getItem('ca_products'));
        if (freshProds && JSON.stringify(freshProds) !== JSON.stringify(products)) {
          setProducts(freshProds);
        }
        const freshOrders = JSON.parse(localStorage.getItem('ca_paid_orders'));
        if (freshOrders && JSON.stringify(freshOrders) !== JSON.stringify(orders)) {
          setOrders(freshOrders);
        }
        const freshPayments = JSON.parse(localStorage.getItem('ca_payments'));
        if (freshPayments && JSON.stringify(freshPayments) !== JSON.stringify(payments)) {
          setPayments(freshPayments);
        }
      } catch (err) {}
    }, 1500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [products, orders, payments]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ca_theme', next);
  };

  const addToCart = (productId) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || prod.avail === false) return;

    setCart(prev => {
      const key = prod.id;
      const existing = prev[key];
      const updated = {
        ...prev,
        [key]: {
          product: prod,
          qty: existing ? existing.qty + 1 : 1
        }
      };
      
      // Save pending cart representation to localstorage
      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[productId]) {
        updated[productId].qty--;
        if (updated[productId].qty <= 0) {
          delete updated[productId];
        }
      }
      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const changeCartQty = (productId, delta) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[productId]) {
        updated[productId].qty += delta;
        if (updated[productId].qty <= 0) {
          delete updated[productId];
        }
      }
      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const savePendingCartToLocalStorage = (currentCart, currentTable) => {
    const items = Object.keys(currentCart).map(key => ({
      id: currentCart[key].product.id,
      name: currentCart[key].product.name,
      emoji: currentCart[key].product.emoji,
      qty: currentCart[key].qty,
      price: currentCart[key].product.price
    }));
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + serviceCharge;

    if (items.length === 0) {
      localStorage.removeItem('ca_pending_cart');
    } else {
      localStorage.setItem('ca_pending_cart', JSON.stringify({
        tableNum: currentTable,
        items,
        subtotal,
        serviceCharge,
        total
      }));
    }
  };

  const clearCart = () => {
    setCart({});
    localStorage.removeItem('ca_pending_cart');
  };

  const updateProducts = (newProductsList) => {
    setProducts(newProductsList);
    localStorage.setItem('ca_products', JSON.stringify(newProductsList));
  };

  const updateOrders = (newOrdersList) => {
    setOrders(newOrdersList);
    localStorage.setItem('ca_paid_orders', JSON.stringify(newOrdersList));
  };

  const updatePayments = (newPaymentsList) => {
    setPayments(newPaymentsList);
    localStorage.setItem('ca_payments', JSON.stringify(newPaymentsList));
  };

  const updateUsers = (newUsersList) => {
    setUsers(newUsersList);
    localStorage.setItem('ca_users', JSON.stringify(newUsersList));
  };

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      tableNum, setTableNum,
      cart, setCart, addToCart, removeFromCart, changeCartQty, clearCart,
      products, updateProducts,
      orders, updateOrders,
      payments, updatePayments,
      users, updateUsers,
      currentUser, setCurrentUser
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
