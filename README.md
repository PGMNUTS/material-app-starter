# Material App – Shopify Inventory Starter (Server + Worker)

A production-ready starter to process Shopify order webhooks, apply BOM-based material deductions with idempotency,
log stock movements, and sync variant inventory back to Shopify.

**Stack**: Node.js (Express), Prisma (PostgreSQL), BullMQ (Redis), HMAC-verified Shopify webhooks.

> This starter targets a **single-store** setup using a **private/custom app token** (env: `SHOPIFY_ACCESS_TOKEN`).
> You can later migrate to full OAuth for a public app. The data model and pipeline remain the same.

---

## 1) What’s included
- ✅ Express server with HMAC verification for `/webhooks/orders/create` and `/webhooks/orders/cancelled`
- ✅ BullMQ queue + worker for background processing
- ✅ Prisma schema with hard unique constraints to **block duplicate order lines**
- ✅ BOM logic: Variant ↔ Material mapping with units-per-sale
- ✅ Stock logs (positive/negative deltas) with references to order and line item
- ✅ Inventory sync stub (GraphQL) to set absolute quantities in Shopify

## 2) Quick Start (Local with Docker for DB/Redis)

### A) Prereqs
- Node 18+
- pnpm or npm
- Docker (for Postgres + Redis) — optional if using Railway/Neon/Upstash

### B) Spin up DB & Redis locally
```bash
docker compose up -d
```

### C) Install & migrate
```bash
npm install
# or: pnpm install

# Create DB schema
npx prisma migrate dev -n init
```

### D) Seed (optional)
Prepare CSVs in `./seed/` (see sample headers) and run:
```bash
node scripts/seedFromCSVs.js
```

### E) Run
```bash
# Starts server AND a background worker in the same process
npm start
# or: pnpm start
```

The server prints a public URL (e.g., Railway) + paths:
- `POST /webhooks/orders/create`
- `POST /webhooks/orders/cancelled`

## 3) Environment Variables

Create a `.env` file (or set on Railway):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/materialapp
REDIS_URL=redis://localhost:6379

# Shopify
SHOPIFY_STORE=nutcaseshop.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOP_LOCATION_ID=gid://shopify/Location/1234567890
```

> Tip: Find `SHOP_LOCATION_ID` via Admin API or Shopify admin (Settings → Locations). For REST you might store numeric, but GraphQL expects a gid. Keep one convention and stick to it.

## 4) Webhook Setup (Private/Custom app)
- In Shopify Admin → Apps → Develop apps → Your App → Webhooks
- Add JSON webhooks for:
  - `orders/create` → `https://YOUR_DOMAIN/webhooks/orders/create`
  - `orders/cancelled` → `https://YOUR_DOMAIN/webhooks/orders/cancelled`
- Use shared secret = `SHOPIFY_WEBHOOK_SECRET`

## 5) Deploy on Railway (fast path)
1. Create **PostgreSQL** and **Redis** services (or use Neon/Upstash).
2. Create a **Node** service and point to this repo.
3. Set env vars (see above).
4. `npx prisma migrate deploy` will run on first start (via `postinstall` script).
5. Add Shopify webhooks to your Railway domain (HTTPS).

## 6) Next Steps / Upgrades
- Swap private token for **OAuth** (public app). You can use `@shopify/shopify-api` and store per-shop tokens in DB.
- Split **worker** to a separate service for higher throughput.
- Batch **inventory sync** via GraphQL mutations.
- Add embedded UI (Remix + Polaris) using the blueprint we prepared earlier.

---

## CSV Seed Formats (headers only)
Place CSVs inside `./seed/` and run `node scripts/seedFromCSVs.js`

- **seed/material_groups.csv**: `name`
- **seed/materials.csv**: `group_name,name,sku,units_per_sale,quantity`
- **seed/variants.csv**: `variant_id,product_id,sku,title,product_title,inventory_item_id`
- **seed/mappings.csv**: `variant_id,material_name,units_per_sale,priority`

> The script auto-creates a Shop record for `SHOPIFY_STORE` if missing.
