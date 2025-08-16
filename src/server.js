// src/server.js
require('dotenv').config();
const express = require('express');
const { orderQueue } = require('./queue');
const { verifyShopifyWebhook } = require('./utils/verify');

const app = express();
const PORT = process.env.PORT || 3000;

// Raw body needed for HMAC verification
app.use('/webhooks', express.raw({ type: '*/*' }));

app.get('/', async (_req, res) => {
  res.send('Material App Starter: up ✅');
});

app.post('/webhooks/orders/create', async (req, res) => {
  const hmac = req.header('X-Shopify-Hmac-Sha256') || '';
  const shopDomain = (req.header('X-Shopify-Shop-Domain') || process.env.SHOPIFY_STORE || '').toString();

  const raw = req.body.toString('utf8');
  if (!verifyShopifyWebhook(raw, hmac)) {
    return res.status(401).send('unauthorized');
  }

  await orderQueue.add('order', { shopDomain, orderPayload: raw }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
  res.status(202).send('ok');
});

app.post('/webhooks/orders/cancelled', async (req, res) => {
  const hmac = req.header('X-Shopify-Hmac-Sha256') || '';
  const shopDomain = (req.header('X-Shopify-Shop-Domain') || process.env.SHOPIFY_STORE || '').toString();

  const raw = req.body.toString('utf8');
  if (!verifyShopifyWebhook(raw, hmac)) {
    return res.status(401).send('unauthorized');
  }

  await orderQueue.add('order', { shopDomain, orderPayload: raw }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });
  res.status(202).send('ok');
});

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('POST /webhooks/orders/create | /webhooks/orders/cancelled');
});

// Start worker in the same process (simple single-service deploy)
require('./workers/orderWorker');
