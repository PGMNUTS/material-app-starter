// src/workers/orderWorker.js
const { prisma } = require('../db');
const { resolveMappings } = require('../services/mappings');
const { syncInventoryBatch } = require('../services/inventory');
const { Worker } = require('bullmq');
const { connection } = require('../queue');

const orderQueueName = 'orders';

const worker = new Worker(orderQueueName, async (job) => {
  const { shopDomain, orderPayload } = job.data;
  const shop = await prisma.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain }
  });

  const order = JSON.parse(orderPayload);
  const action = order.cancelled_at ? 'Cancelled' : 'Paid';
  const lines = order.line_items || [];
  const toSync = new Set();

  for (const li of lines) {
    const key = {
      shopId: shop.id,
      orderId: String(order.name || order.id),
      action,
      variantId: String(li.variant_id),
      lineItemId: String(li.id),
    };

    try {
      await prisma.orderRaw.create({
        data: { ...key, qty: li.quantity, payloadHash: '' }
      });
    } catch (e) {
      // duplicate (unique constraint) -> skip
      continue;
    }

    const maps = await resolveMappings(shop.id, String(li.variant_id));
    if (maps.length === 0) {
      await prisma.orderRaw.updateMany({ where: key, data: { status: 'NOT_MAPPED' } });
      continue;
    }

    for (const map of maps) {
      const delta = (action === 'Cancelled' ? 1 : -1) * li.quantity * (map.unitsPerSale || 1);
      await prisma.$transaction(async (tx) => {
        const mat = await tx.material.findUnique({ where: { id: map.materialId } });
        if (!mat) throw new Error('Material not found');

        await tx.material.update({
          where: { id: mat.id },
          data: { quantity: mat.quantity + delta }
        });

        await tx.stockLog.create({
          data: {
            shopId: shop.id,
            materialId: mat.id,
            source: action === 'Cancelled' ? 'cancellation' : 'order',
            qtyDelta: delta,
            refOrderId: key.orderId,
            refLineItem: key.lineItemId,
          }
        });
      });
    }

    toSync.add(String(li.variant_id));
    await prisma.orderRaw.updateMany({ where: key, data: { status: 'DONE' } });
  }

  if (toSync.size) {
    await syncInventoryBatch(shop, Array.from(toSync));
  }
}, { connection });

worker.on('completed', (job) => console.log('[worker] completed', job.id));
worker.on('failed', (job, err) => console.error('[worker] failed', job?.id, err));
