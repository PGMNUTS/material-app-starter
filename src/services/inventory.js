// src/services/inventory.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function syncInventoryBatch(shop, variants) {
  // Minimal stub for absolute quantity sync.
  console.log('[syncInventoryBatch] Variants to sync:', variants);
  // TODO: Add GraphQL mutation for set-on-hand quantities.
}

module.exports = { syncInventoryBatch };
