# AASAMEDCHEM - Pharma Inventory & Order Management System

AASAMEDCHEM is a professional, high-precision inventory and order management web application designed for a pharmaceutical company. Built with **Next.js**, **Neon-hosted PostgreSQL**, and **Prisma ORM**, it features a clean, responsive, and beautiful **light pink** design system themed specifically for medical/pharma branding.

## 🌟 Live Demo
The application is ready for deployment on Vercel. 
* **Live Deployment URL**: [https://aasamedchem.vercel.app](https://aasamedchem.vercel.app) *(or your deployed Vercel URL)*

---

## 🛠️ Tech Stack & System Design

```mermaid
graph TD
  User[Seller / Admin Browser] -->|HTTP / JSON Requests| NextJS[Next.js App Router Frontend & API Routes]
  NextJS -->|Session cookie check| Auth[Auth Middleware]
  NextJS -->|Prisma Client / TCP Connection| Neon[Neon PostgreSQL DB]
```

### High-Level Architecture
1. **Frontend**: Built using Next.js client-side React components styled with premium **Vanilla CSS**. Uses dynamic state hooks to calculate unit conversions and order previews instantly in the browser.
2. **Backend**: Next.js App Router Server APIs (`/api/*`) handle user authentication (secure HttpOnly cookies), product CRUD, order placement inside a database transaction, and order approval/rejection auditing.
3. **Database**: Hosted on **Neon Serverless PostgreSQL**. **Prisma ORM** is used for schema mapping, queries, and type safety.

---

## 📊 Database Schema & Key Tables

To handle high pharmaceutical measurements (e.g. milligrams of powder, milliliters of liquid, or precise batch counts) and avoid floating-point rounding errors, the database uses PostgreSQL's native `NUMERIC` data type.

| Field Name | PostgreSQL Type | Prisma Type | Description |
| :--- | :--- | :--- | :--- |
| `Product.pricePerBaseUnit` | `NUMERIC(20, 6)` | `Decimal` | Base price in INR (e.g., ₹1.500000 per gram) |
| `Product.stockQuantity` | `NUMERIC(20, 6)` | `Decimal` | Current stock level (e.g., 25.500000 kg) |
| `OrderItem.orderedQuantity` | `NUMERIC(20, 6)` | `Decimal` | Original quantity requested |
| `OrderItem.convertedQuantity` | `NUMERIC(20, 6)` | `Decimal` | Equivalent quantity converted to base unit |
| `OrderItem.calculatedPrice` | `NUMERIC(20, 2)` | `Decimal` | Calculated item cost in INR |

### Tables Structure

#### 1. `User` (Accounts)
* `id` (`UUID`, Primary Key)
* `username` (`VARCHAR`, Unique) - Account identifier
* `passwordHash` (`VARCHAR`) - SHA-256 secure hash
* `role` (`VARCHAR`) - Either `ADMIN` or `SELLER`
* `name` (`VARCHAR`) - Profile display name

#### 2. `Product` (Inventory Items)
* `id` (`UUID`, Primary Key)
* `sku` (`VARCHAR`, Unique) - Stock Keeping Unit code
* `name` (`VARCHAR`) - Product name
* `description` (`TEXT`, Nullable)
* `category` (`VARCHAR`, Nullable)
* `baseUnit` (`VARCHAR`) - Internal inventory storage unit (`g`, `kg`, `mL`, `L`, `items`)
* `pricePerBaseUnit` (`NUMERIC(20, 6)`) - Base rate in INR
* `stockQuantity` (`NUMERIC(20, 6)`) - Available stock in base unit

#### 3. `Order` (Quotations)
* `id` (`UUID`, Primary Key)
* `userId` (`UUID`, Foreign Key) - Associated seller user
* `status` (`VARCHAR`) - `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`
* `totalPrice` (`NUMERIC(20, 2)`) - Sum total in INR

#### 4. `OrderItem` (Order Lines)
* `id` (`UUID`, Primary Key)
* `orderId` (`UUID`, Foreign Key) - Associated order
* `productId` (`UUID`, Foreign Key) - Associated product
* `orderedQuantity` (`NUMERIC(20, 6)`) - Original quantity input
* `orderedUnit` (`VARCHAR`) - Unit chosen by seller
* `convertedQuantity` (`NUMERIC(20, 6)`) - Converted stock deduction in base unit
* `baseUnit` (`VARCHAR`) - Product base unit at order time
* `pricePerBaseUnit` (`NUMERIC(20, 6)`) - Rate per base unit at order time
* `calculatedPrice` (`NUMERIC(20, 2)`) - Price in INR for this line item

---

## ⚖️ Unit Storage & Conversion Strategy

### 1. Dimension Definitions
We categorize units into three physical dimensions:
* **Mass**: Grams (`g`), Kilograms (`kg`) [Conversion factor relative to `g`: `1 kg = 1000 g`]
* **Volume**: Milliliters (`mL`), Liters (`L`) [Conversion factor relative to `mL`: `1 L = 1000 mL`]
* **Count**: Items (`items`) [Conversion factor: `1 item = 1 item`]

### 2. Storage Strategy
* Inventory level (`stockQuantity`) and prices (`pricePerBaseUnit`) are stored **strictly in the product's configured base unit**. E.g. if the base unit is `g`, stock is stored in grams, and price is per gram.
* This removes ambiguity as there is always exactly **one single source of truth** for each product's base weight or volume.

### 3. Application of Conversions
Conversions are applied in two distinct layers:
* **Client View Preview (Real-time)**: When a seller inputs a quantity and selects a unit (e.g. `g` or `kg`), the client-side calculator imports the shared `units.js` conversion library and immediately renders:
  1. The equivalent quantity in the product's base unit.
  2. The total calculated cost in INR.
  3. A stock validation check.
* **Server Verification & Transaction (API)**: When the order is submitted, the API route performs the exact same mathematical conversion inside a **database transaction** (`db.$transaction`). It locks the stock, verifies availability, deducts stock in the base unit, and writes the conversion details to the `OrderItem` audit trail.

---

## 🔑 Login & Test Credentials

You can use the **Quick Fill** buttons on the Login page to fill these credentials automatically, or type them:

* **Admin User**:
  * Username: `admin`
  * Password: `admin123`
* **Seller/User**:
  * Username: `seller`
  * Password: `seller123`

---

## 🚀 Setup Instructions (Local Execution)

### 1. Clone & Install Dependencies
```bash
# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a file named `.env` in the root directory:
```env
DATABASE_URL="postgresql://neondb_owner:npg_0YDdju7ovNcZ@ep-bitter-poetry-aqmxo0y5.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
SESSION_SECRET="aasamedchem_super_secret_session_token_key_12345"
```

### 3. Setup Database Schema & Seed Data
Initialize your PostgreSQL database and seed sample products:
```bash
# Push schema structure to Neon PostgreSQL
npx prisma db push

# Seed users and sample products
node prisma/seed.js
```

### 4. Run Locally
```bash
# Run local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Unit Tests
To verify unit conversions:
```bash
node src/lib/__tests__/units.test.js
```

---

## ☁️ Deployment to Vercel

The application is fully compatible with Vercel serverless functions:

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial implementation of AASAMEDCHEM"
   ```
2. **Deploy on Vercel**:
   * Go to [vercel.com](https://vercel.com) and import your repository.
   * Add the following **Environment Variables** in the Vercel dashboard:
     * `DATABASE_URL`: `postgresql://neondb_owner:npg_0YDdju7ovNcZ@ep-bitter-poetry-aqmxo0y5.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`
     * `SESSION_SECRET`: `aasamedchem_super_secret_session_token_key_12345`
   * Click **Deploy**. Vercel will build the optimized production bundle and supply a live URL!
