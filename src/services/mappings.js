// src/services/mappings.js
const { prisma } = require('../db');

async function resolveMappings(shopId, variantId) {
  return prisma.variantMaterialMap.findMany({
    where: { shopId, variantId },
    include: { material: true }
  });
}

module.exports = { resolveMappings };
