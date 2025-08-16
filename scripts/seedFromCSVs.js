// scripts/seedFromCSVs.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { prisma } = require('../src/db');

(async () => {
  try {
    const shopDomain = process.env.SHOPIFY_STORE;
    if (!shopDomain) throw new Error('SHOPIFY_STORE missing in env');

    const shop = await prisma.shop.upsert({
      where: { shopDomain },
      update: {},
      create: { shopDomain }
    });

    const seedDir = path.join(process.cwd(), 'seed');

    // Material Groups
    const mgPath = path.join(seedDir, 'material_groups.csv');
    if (fs.existsSync(mgPath)) {
      const content = fs.readFileSync(mgPath, 'utf8');
      const rows = parse(content, { columns: true, skip_empty_lines: true });
      for (const r of rows) {
        await prisma.materialGroup.create({
          data: { shopId: shop.id, name: r.name }
        });
      }
    }

    // Material Groups lookup
    const groups = await prisma.materialGroup.findMany({ where: { shopId: shop.id } });
    const groupByName = new Map(groups.map(g => [g.name, g]));

    // Materials
    const mPath = path.join(seedDir, 'materials.csv');
    if (fs.existsSync(mPath)) {
      const content = fs.readFileSync(mPath, 'utf8');
      const rows = parse(content, { columns: true, skip_empty_lines: true });
      for (const r of rows) {
        const grp = groupByName.get(r.group_name);
        if (!grp) continue;
        await prisma.material.create({
          data: {
            shopId: shop.id,
            groupId: grp.id,
            name: r.name,
            sku: r.sku || null,
            unitsPerSale: parseInt(r.units_per_sale || '1', 10),
            quantity: parseInt(r.quantity || '0', 10),
          }
        });
      }
    }

    // Variants
    const vPath = path.join(seedDir, 'variants.csv');
    if (fs.existsSync(vPath)) {
      const content = fs.readFileSync(vPath, 'utf8');
      const rows = parse(content, { columns: true, skip_empty_lines: true });
      for (const r of rows) {
        await prisma.variant.upsert({
          where: { id: String(r.variant_id) },
          update: {
            productId: String(r.product_id),
            sku: r.sku || null,
            title: r.title || '',
            productTitle: r.product_title || '',
            inventoryItemId: String(r.inventory_item_id || ''),
          },
          create: {
            id: String(r.variant_id),
            shopId: shop.id,
            productId: String(r.product_id),
            sku: r.sku || null,
            title: r.title || '',
            productTitle: r.product_title || '',
            inventoryItemId: String(r.inventory_item_id || ''),
          }
        });
      }
    }

    // Mappings
    const mapPath = path.join(seedDir, 'mappings.csv');
    if (fs.existsSync(mapPath)) {
      const content = fs.readFileSync(mapPath, 'utf8');
      const rows = parse(content, { columns: true, skip_empty_lines: true });
      const mats = await prisma.material.findMany({ where: { shopId: shop.id } });
      const matByName = new Map(mats.map(m => [m.name, m]));
      for (const r of rows) {
        const mat = matByName.get(r.material_name);
        if (!mat) continue;
        await prisma.variantMaterialMap.upsert({
          where: { id: `${shop.id}_${r.variant_id}_${mat.id}` },
          update: {
            unitsPerSale: parseInt(r.units_per_sale || '1', 10),
            priority: parseInt(r.priority || '1', 10)
          },
          create: {
            id: `${shop.id}_${r.variant_id}_${mat.id}`,
            shopId: shop.id,
            variantId: String(r.variant_id),
            materialId: mat.id,
            unitsPerSale: parseInt(r.units_per_sale || '1', 10),
            priority: parseInt(r.priority || '1', 10)
          }
        });
      }
    }

    console.log('Seed complete ✅');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
