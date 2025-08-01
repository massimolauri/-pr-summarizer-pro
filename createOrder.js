// createOrder.js
// E-commerce checkout with PayPal Orders API
const express = require('express');
const { v4: uuid } = require('uuid');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

// ---- fake catalog ----
const PRODUCTS = {
  101: { id: 101, name: 'Node T-Shirt', price: 19.9, stock: 50 },
  102: { id: 102, name: 'Express Mug', price: 9.9, stock: 30 },
  103: { id: 103, name: 'MongoDB Sticker Pack', price: 5.5, stock: 100 }
};

// ---- PayPal config ----
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'YOUR_CLIENT_ID';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

const ORDERS = [];

app.post('/api/create-paypal-order', async (req, res) => {
  const { userId, cart } = req.body;

  let total = 0;
  const items = [];

  // Validate and calculate
  for (const { productId, qty } of cart) {
    const product = PRODUCTS[productId];
    if (!product) return res.status(400).json({ error: 'Product not found' });
    if (qty > product.stock) return res.status(400).json({ error: `Not enough stock for ${product.name}` });

    items.push({
      name: product.name,
      unit_amount: { currency_code: 'USD', value: product.price.toFixed(2) },
      quantity: qty.toString()
    });
    total += product.price * qty;
  }

  const totalStr = total.toFixed(2);

  // Create PayPal order
  const accessToken = await getPayPalAccessToken();
  const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: uuid(),
        amount: {
          currency_code: 'USD',
          value: totalStr,
          breakdown: {
            item_total: { currency_code: 'USD', value: totalStr }
          }
        },
        items
      }]
    })
  }).then(r => r.json());

  // Reserve stock
  cart.forEach(({ productId, qty }) => PRODUCTS[productId].stock -= qty);

  res.json({ orderID: order.id });
});

app.post('/api/capture-paypal-order', async (req, res) => {
  const { orderID } = req.body;
  const accessToken = await getPayPalAccessToken();

  const capture = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer