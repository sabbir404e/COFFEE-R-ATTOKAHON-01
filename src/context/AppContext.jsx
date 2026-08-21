'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AppContext = createContext();

// ---------------------------------------------------------------------------
// Feedback helper
// ---------------------------------------------------------------------------
function mapFeedback(f) {
  return {
    ...f,
    orderId: f.order_id,
    table: f.table_id,
    time: f.created_at,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    cat: p.category,
    price: Number(p.price),
    emoji: p.emoji,
    image: p.image_url || p.image || null,
    image_url: p.image_url || p.image || null,
    desc: p.description,
    avail: p.is_available,
  };
}

function mapOrder(o, orderItemsData) {
  const items = orderItemsData
    .filter((i) => i.order_id === o.id)
    .map((i) => ({
      id: i.product_id,
      productId: i.product_id,
      name: i.product_name || i.name,
      price: Number(i.unit_price || i.price || 0),
      qty: Number(i.quantity || i.qty || 1),
      emoji: i.emoji,
      image: i.image_url || i.image || null,
      customization: i.customization,
    }));
  return {
    id: o.id,
    invoiceNum: o.invoice_num,
    table: o.table_id,
    items,
    subtotal: Number(o.subtotal),
    serviceCharge: Number(o.service_charge),
    total: Number(o.total),
    note: o.note,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentId: o.payment_id,
    senderPhone: o.sender_phone,
    time: o.created_at,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AppProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [tableNum, setTableNumState] = useState(null);

  const setTableNum = (num) => {
    setTableNumState(num);
    if (typeof window !== 'undefined') {
      if (num) {
        localStorage.setItem('ca_table_num', String(num));
      } else {
        localStorage.removeItem('ca_table_num');
      }
    }
  };

  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Keep a ref to raw order_items so we can re-enrich orders when items change
  const orderItemsRef = useRef([]);

  // --------------------------------------------------------------------------
  // Initial load
  // --------------------------------------------------------------------------
  const fetchData = async () => {
    try {
      const [
        { data: tablesData },
        { data: productsData },
        { data: ordersData },
        { data: paymentsData },
        { data: usersData },
        { data: orderItemsData },
        { data: feedbackData },
      ] = await Promise.all([
        supabase.from('dining_tables').select('*').order('id', { ascending: true }),
        supabase.from('products').select('*').order('id', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*'),
        supabase.from('order_items').select('*'),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      ]);

      if (tablesData) setTables(tablesData);
      if (productsData) setProducts(productsData.map(mapProduct));
      if (usersData) setUsers(usersData);
      if (paymentsData) setPayments(paymentsData);
      if (feedbackData) setFeedback(feedbackData.map(mapFeedback));

      const items = orderItemsData || [];
      orderItemsRef.current = items;

      if (ordersData) {
        setOrders(ordersData.map((o) => mapOrder(o, items)));
      }
    } catch (error) {
      console.error('Error fetching Supabase data:', error);
    }
  };

  // --------------------------------------------------------------------------
  // Theme, table & cart from localStorage
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('ca_theme') || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        const savedTable = localStorage.getItem('ca_table_num');
        if (savedTable) {
          setTableNumState(parseInt(savedTable, 10));
        }

        const savedCart = localStorage.getItem('ca_pending_cart');
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            if (parsed && parsed.items) {
              const reconstructedCart = {};
              parsed.items.forEach((item) => {
                reconstructedCart[item.id || item.name] = {
                  product: { name: item.name, emoji: item.emoji, price: item.price, id: item.id },
                  qty: item.qty,
                };
              });
              setCart(reconstructedCart);
            }
          } catch (e) {}
        }
      }
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  // --------------------------------------------------------------------------
  // Real-time subscriptions
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      fetchData();
    });

    // --- dining_tables ---
    const tablesSub = supabase
      .channel('rt_dining_tables')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dining_tables' }, ({ new: row }) => {
        setTables((prev) => [...prev, row].sort((a, b) => a.id - b.id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dining_tables' }, ({ new: row }) => {
        setTables((prev) => prev.map((t) => (t.id === row.id ? row : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dining_tables' }, ({ old: row }) => {
        setTables((prev) => prev.filter((t) => t.id !== row.id));
      })
      .subscribe();

    // --- products ---
    const productsSub = supabase
      .channel('rt_products')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, ({ new: row }) => {
        setProducts((prev) => {
          if (prev.some((p) => p.id === row.id)) return prev;
          return [mapProduct(row), ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, ({ new: row }) => {
        setProducts((prev) => prev.map((p) => (p.id === row.id ? mapProduct(row) : p)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'products' }, ({ old: row }) => {
        setProducts((prev) => prev.filter((p) => p.id !== row.id));
      })
      .subscribe();

    // --- orders ---
    const ordersSub = supabase
      .channel('rt_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, ({ new: row }) => {
        setOrders((prev) => [mapOrder(row, orderItemsRef.current), ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, ({ new: row }) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === row.id ? mapOrder(row, orderItemsRef.current) : o))
        );
        if (row && row.status === 'served') {
          try {
            const lastId = typeof window !== 'undefined' ? localStorage.getItem('ca_last_order_id') : null;
            if (String(row.id) === String(lastId)) {
              setCart({});
              localStorage.removeItem('ca_pending_cart');
            }
          } catch (e) {}
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, ({ old: row }) => {
        setOrders((prev) => prev.filter((o) => o.id !== row.id));
      })
      .subscribe();

    // --- order_items (re-enrich affected order on change) ---
    const orderItemsSub = supabase
      .channel('rt_order_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, async ({ new: row, old: oldRow }) => {
        // Re-fetch all items for the affected order and update state
        const affectedOrderId = row?.order_id || oldRow?.order_id;
        if (!affectedOrderId) return;

        const { data: freshItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', affectedOrderId);

        if (freshItems) {
          // Merge into the global ref
          const otherItems = orderItemsRef.current.filter((i) => i.order_id !== affectedOrderId);
          orderItemsRef.current = [...otherItems, ...freshItems];

          setOrders((prev) =>
            prev.map((o) =>
              o.id === affectedOrderId
                ? { ...o, items: freshItems.map((i) => ({ id: i.product_id, productId: i.product_id, name: i.product_name || i.name, price: Number(i.unit_price || i.price || 0), qty: Number(i.quantity || i.qty || 1), emoji: i.emoji, image: i.image_url || i.image || null, customization: i.customization })) }
                : o
            )
          );
        }
      })
      .subscribe();

    // --- payments ---
    const paymentsSub = supabase
      .channel('rt_payments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, ({ new: row }) => {
        setPayments((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments' }, ({ new: row }) => {
        setPayments((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payments' }, ({ old: row }) => {
        setPayments((prev) => prev.filter((p) => p.id !== row.id));
      })
      .subscribe();

    // --- users ---
    const usersSub = supabase
      .channel('rt_users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, ({ new: row }) => {
        setUsers((prev) => [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, ({ new: row }) => {
        setUsers((prev) => prev.map((u) => (u.id === row.id ? row : u)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users' }, ({ old: row }) => {
        setUsers((prev) => prev.filter((u) => u.id !== row.id));
      })
      .subscribe();

    // --- feedback ---
    const feedbackSub = supabase
      .channel('rt_feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, ({ new: row }) => {
        setFeedback((prev) => [mapFeedback(row), ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feedback' }, ({ new: row }) => {
        setFeedback((prev) => prev.map((f) => (f.id === row.id ? mapFeedback(row) : f)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'feedback' }, ({ old: row }) => {
        setFeedback((prev) => prev.filter((f) => f.id !== row.id));
      })
      .subscribe();

    return () => {
      cancelAnimationFrame(handle);
      tablesSub.unsubscribe();
      productsSub.unsubscribe();
      ordersSub.unsubscribe();
      orderItemsSub.unsubscribe();
      paymentsSub.unsubscribe();
      usersSub.unsubscribe();
      feedbackSub.unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Theme
  // --------------------------------------------------------------------------
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ca_theme', next);
  };

  // --------------------------------------------------------------------------
  // Cart helpers
  // --------------------------------------------------------------------------
  const savePendingCartToLocalStorage = (currentCart, currentTable) => {
    const items = Object.keys(currentCart).map((key) => ({
      id: currentCart[key].product.id,
      name: currentCart[key].product.name,
      emoji: currentCart[key].product.emoji,
      qty: currentCart[key].qty,
      price: currentCart[key].product.price,
      customization: currentCart[key].product.customization || null,
    }));
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + serviceCharge;
    if (items.length === 0) {
      localStorage.removeItem('ca_pending_cart');
    } else {
      localStorage.setItem('ca_pending_cart', JSON.stringify({ tableNum: currentTable, items, subtotal, serviceCharge, total }));
    }
  };

  const addToCart = (productId, customization = null) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || prod.avail === false) return;
    setCart((prev) => {
      const surcharge = customization?.surcharge || 0;
      const key = customization
        ? `${prod.id}-${customization.size}-${customization.sugar}-${customization.milk}-${customization.extraShot}-${customization.notes}`
        : prod.id;
      const existing = prev[key];
      const cartProduct = customization
        ? { ...prod, cartKey: key, price: prod.price + surcharge, customization }
        : { ...prod, cartKey: key };
      const updated = { ...prev, [key]: { product: cartProduct, qty: existing ? existing.qty + 1 : 1 } };
      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId]) {
        updated[productId].qty--;
        if (updated[productId].qty <= 0) delete updated[productId];
      }
      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const changeCartQty = (productId, delta) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId]) {
        updated[productId].qty += delta;
        if (updated[productId].qty <= 0) delete updated[productId];
      }
      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const updateCartItem = (oldKey, productId, customization = null) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setCart((prev) => {
      const existingEntry = prev[oldKey];
      if (!existingEntry) return prev;
      const currentQty = existingEntry.qty;

      const surcharge = customization?.surcharge || 0;
      const newKey = customization
        ? `${prod.id}-${customization.size}-${customization.sugar}-${customization.milk}-${customization.extraShot}-${customization.notes}`
        : prod.id;

      const updated = { ...prev };
      delete updated[oldKey];

      const cartProduct = customization
        ? { ...prod, cartKey: newKey, price: prod.price + surcharge, customization }
        : { ...prod, cartKey: newKey };

      if (updated[newKey]) {
        updated[newKey] = {
          product: cartProduct,
          qty: updated[newKey].qty + currentQty,
        };
      } else {
        updated[newKey] = {
          product: cartProduct,
          qty: currentQty,
        };
      }

      savePendingCartToLocalStorage(updated, tableNum);
      return updated;
    });
  };

  const clearCart = () => {
    setCart({});
    localStorage.removeItem('ca_pending_cart');
  };

  // --------------------------------------------------------------------------
  // Legacy shims (kept for compatibility)
  // --------------------------------------------------------------------------
  const updateProducts = async (list) => setProducts(list);
  const updateOrders = async (list) => setOrders(list);
  const updatePayments = async (list) => setPayments(list);
  const updateUsers = async (list) => setUsers(list);
  const updateTables = async (list) => setTables(list);
  const addTable = () => {};
  const removeLastTable = () => {};
  const deleteTable = async (id) => {
    const { error } = await supabase.from('dining_tables').delete().eq('id', id);
    if (error) {
      alert(`Could not delete table: ${error.message}`);
    }
    // Realtime DELETE event will update state automatically
  };

  return (
    <AppContext.Provider
      value={{
        theme, toggleTheme, tableNum, setTableNum,
        tables, updateTables, addTable, removeLastTable, deleteTable, tableCount: tables.length,
        cart, setCart, addToCart, updateCartItem, removeFromCart, changeCartQty, clearCart,
        products, updateProducts,
        orders, updateOrders,
        payments, updatePayments,
        users, updateUsers,
        feedback,
        currentUser, setCurrentUser,
        fetchData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
