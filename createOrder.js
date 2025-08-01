// createOrder.js
// A self-contained, in-memory e-commerce order creator
const { v4: uuid } = require('uuid');

// ---- fake catalog ----
const PRODUCTS = {
  101: { id: 101, name: 'Node T-Shirt', price: 19.9, stock: 50 },
  102: { id: 102, name: 'Express Mug', price: 9.9, stock: 30 },
  103: { id: 103, name: 'MongoDB Sticker Pack', price: 5.5, stock: 100 }
};

// ---- cart shape expected by createOrder ----
const sampleCart = [
  { productId: 101, qty: 2 },   // 2 t-shirts
  { productId: 103, qty: 1 }    // 1 sticker pack
];

/**
 * Creates an order from a shopping-cart.
 * @param {string} userId  – any string to identify the user
 * @param {Array<{productId:number, qty:number}>} cart
 * @param {string} paymentIntentId – fake payment id
 * @returns {Order}
 */
function createOrder(userId, cart, paymentIntentId = 'pi_mock') {
  let total = 0;
  const items = [];

  for (const { productId, qty } of cart) {
    const product = PRODUCTS[productId];
    if (!product) throw new Error(`Product ${productId} not found`);
    if (qty > product.stock) throw new Error(`Not enough stock for ${product.name}`);

    items.push({
      productId,
      name: product.name,
      price: product.price,
      qty,
      subtotal: product.price * qty
    });
    total += product.price * qty;
    product.stock -= qty; // mutate in-memory stock
  }

  const order = {
    id: uuid(),
    userId,
    items,
    total: Number(total.toFixed(2)),
    currency: 'USD',
    paymentIntentId,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  // persist in memory (lost on restart)
  ORDERS.push(order);
  return order;
}

// ---- simple in-memory store ----
const ORDERS = [];

// ---- demo run ----
try {
  const order = createOrder('user_42', sampleCart);
  console.log('✅ Order created:\n', JSON.stringify(order, null, 2));
  console.table(order.items);
} catch (err) {
  console.error('❌', err.message);
}