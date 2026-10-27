# Mitti Market — a marketplace for makers

Mitti Market is an India-focused ecommerce marketplace for handmade home, textile, and folk-art pieces. A shopper can discover an object by craft or region, learn who made it, place an order, and follow its journey. A curator manages maker listings, available stock, and fulfillment.

## Why this product

Handmade products often reach buyers with little information about the craft or artisan behind them. Mitti Market makes that context part of shopping: every listing connects an object to its maker, place, and technique. The product is a functional marketplace, not a static gallery.

## Main workflows

1. **Discover by craft and place** — search and filter products by craft tradition and region, sort by price or popularity, save favourites, and open a maker story.
2. **Build a bag and check out** — adjust quantities, see stock and delivery threshold, provide an Indian delivery address, choose cash on delivery or a clearly labelled simulated prepaid option, and place the order.
3. **Track a purchase** — sign up or sign in, view the account’s orders, and see order status.
4. **Curate the marketplace** — admins add maker listings, adjust inventory, and advance orders through making, packing, delivery, and completion. Cancellation restores inventory before fulfillment.

## Technology

- **Frontend:** React, Vite, React Icons, responsive CSS
- **Backend:** Node.js, Express REST API
- **Database:** MongoDB with Mongoose (optional in local demo mode)
- **Authentication:** bcrypt password hashes and JWT bearer tokens

## Architecture and data

```text
React storefront → Express API → MongoDB
                         ├── Auth and admin authorization
                         ├── Craft/region catalog discovery
                         ├── Checkout and inventory validation
                         └── Order status and curator tools
```

Core entities are **User**, **Product** (including craft, region, artisan, and story), and **Order** (including an immutable product/price snapshot, shipping address, payment method, and status). Checkout prices come from the server catalog, not the browser. In MongoDB mode, conditional stock updates and order creation run inside a transaction; use Atlas or another replica set. Order transitions are validated by the API.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
# Change the example JWT and demo admin secrets in .env
npm run dev
```

Open **http://localhost:5174**. The Express API runs at **http://localhost:5001**. By default, the API uses seeded in-memory data so the demo can run without a database. Accounts, stock changes, and orders in this mode reset when the API restarts. If the API is unavailable, the browser preview keeps demo state on that device.

To use MongoDB, set `MONGODB_URI` in `.env` to an Atlas or replica-set connection string. The app seeds the sample craft collection when the database has no products. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to create a persistent curator account. In-memory mode uses `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD`.

The prepaid choice is a simulated academic demo flow and never collects card details or charges money. Do not describe it as live payment processing.

## Environment variables

| Variable | Use |
|---|---|
| `PORT` | Express port (default `5001`) |
| `MONGODB_URI` | Optional MongoDB replica-set URI |
| `JWT_SECRET` | Private JWT signing secret; use at least 32 random characters in production |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS |
| `VITE_API_BASE` | Deployed API origin for the built frontend; blank uses Vite’s local proxy |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional initial MongoDB curator account |
| `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Optional in-memory curator account |

Never commit `.env` or real secrets.

## API

- `GET /api/health` — reports the active storage mode
- `GET /api/products?q=&craft=&region=&sort=` — discovery and sorting
- `POST /api/auth/register`, `POST /api/auth/login` — customer accounts
- `GET /api/orders`, `POST /api/orders` — customer order history and checkout
- `GET /api/admin/orders` — curator order queue
- `POST /api/admin/products`, `PATCH /api/admin/products/:id` — create listings and update stock
- `PATCH /api/admin/orders/:id/status` — validated fulfillment transition

Authenticated routes expect `Authorization: Bearer <token>`. Admin routes reject customer tokens.

## Suggested evaluation demo (3–5 minutes)

1. Search for a craft or filter to a region; open a piece and introduce its maker.
2. Add two pieces to the bag, adjust quantity, and continue with a valid PIN code.
3. Place a test checkout and show the order confirmation and account history.
4. Sign in as the curator, show the stock change, then advance the order from Confirmed to Making, Packed, On the way, and Delivered.
5. Add a new maker listing and show it in the collection.

Use the demo curator credentials configured in `.env` for the walkthrough. Add the public GitHub, deployed app, and demo-video URLs here after publishing.
