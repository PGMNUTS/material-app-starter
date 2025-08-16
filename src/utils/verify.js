// src/utils/verify.js
const crypto = require('crypto');

function verifyShopifyWebhook(rawBody, hmac) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac || '' ));
  } catch {
    return false;
  }
}

module.exports = { verifyShopifyWebhook };
