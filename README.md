# Lenja International Handicraft — Full-stack v3

This version replaces the demo-only localStorage authentication/product management with a real Node.js + Express + MongoDB backend.

## Stack
- Frontend: HTML/CSS/JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt password hashing
- Payments: eSewa ePay v2 server-side initialization and verification
- QR: a QR code that opens a Lenja payment page which redirects to eSewa

## What is now enforced by the backend
- Signup creates a normal `user` account only.
- Login returns a signed JWT.
- Admin routes require both authentication and the `admin` role.
- Admin users cannot create orders, even if they bypass the frontend.
- Product add/edit/remove is stored in MongoDB.
- Orders are stored in MongoDB and prices are read from the database rather than trusted from the browser.
- eSewa responses are signature-verified before an order becomes paid.

## Setup

### 1. Install requirements
Install Node.js 18+ and MongoDB.

### 2. Install packages
```bash
npm install
```

### 3. Create environment file
Copy `.env.example` to `.env` and change at least:
- `MONGODB_URI`
- `JWT_SECRET`
- `PUBLIC_BASE_URL` when deployed
- eSewa production credentials when you receive them

### 4. Seed database
```bash
npm run seed
```

Demo accounts:
- Admin: `admin@lenjahandicraft.com` / `admin123`
- User: `user@lenjahandicraft.com` / `user123`

Change these credentials before a real deployment.

### 5. Start
```bash
npm start
```
Open `http://localhost:5000`.

For development:
```bash
npm run dev
```

## API
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` — admin
- `PUT /api/products/:id` — admin
- `DELETE /api/products/:id` — admin (soft delete)
- `POST /api/orders` — user only
- `GET /api/orders/mine` — logged-in user
- `GET /api/orders` — admin
- `PATCH /api/orders/:id/status` — admin
- `POST /api/payments/esewa/init` — user only
- `POST /api/payments/esewa/verify` — payment callback verification
- `GET /api/payments/esewa/status/:orderId` — user status check

## eSewa
The backend follows eSewa's documented ePay v2 flow: generate an HMAC-SHA256 signature, send the customer to eSewa, verify the returned signed response, and use the status-check API when necessary.

The current `.env.example` uses eSewa's UAT/test product code and secret key. Replace them with the live merchant credentials provided by eSewa before production.

The QR is not a fake "payment completed" QR. It opens a signed Lenja payment session and then redirects the customer to eSewa. For QR scanning from a phone, `PUBLIC_BASE_URL` must be a public HTTPS URL reachable by that phone.

## Production checklist
- Use HTTPS.
- Use a strong random `JWT_SECRET`.
- Use a managed/secured MongoDB instance and database credentials.
- Replace test eSewa credentials with live merchant credentials.
- Configure real success/failure URLs.
- Add rate limiting, request validation, logging and backups.
- Move product images to object storage rather than relying on arbitrary image URLs.
- Use atomic stock reservation/decrement logic to prevent overselling under heavy concurrent traffic.
- Never commit `.env` to Git.

### Optional: run MongoDB with Docker
If you have Docker Desktop:
```bash
docker compose up -d mongo
npm install
npm run seed
npm start
```


## Digital QR payment
The checkout now uses `public/assets/payment-qr.png`. Because this is a static bank QR, the app cannot independently verify the bank transfer. Customers submit the payment for verification, and an administrator approves or rejects it from the Admin > Orders panel. The customer then sees Payment successful or Payment unsuccessful.


## Digital QR payment
The supplied merchant QR is stored at `public/images/payment-qr.png`. Because it is a static bank QR, the website cannot automatically know whether a bank transfer completed. Customers can submit a completed/unsuccessful confirmation and an optional reference number; admins can verify the reference and click **Mark Paid** in the Orders panel.
