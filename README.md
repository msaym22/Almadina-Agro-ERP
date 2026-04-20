# Almadina Agro ERP — Voice-to-SQL Inventory System

**Status: Production** — currently processing 70,000 PKR in daily transactions at a family agricultural warehouse in Vehari, Punjab.

A full-stack ERP built around a specific constraint: the warehouse staff are low-literacy Punjabi speakers who cannot use text-based interfaces. The solution is a **Voice-to-SQL engine** that accepts spoken Urdu commands and queries the inventory database directly — no typing required. Visual crop icons replace all text navigation, so workers identify products by image rather than name.

---

## The Core Problem This Solves

Standard ERP software assumes literacy and keyboard access. In a rural Punjabi warehouse, neither holds. The first version of this system failed because Ali Uncle, the warehouse manager, set down the tablet and said: *"Son, I cannot read the letters. I only know the weight."*

The second version was built around how the workers actually think:

- **Visual crop icons** replace all text fields in the product interface
- **Voice commands in spoken Urdu** trigger SQL queries — no typing at any point
- **Phonetic dialect mapping** handles the variation in how the same word sounds across different speakers and regions in rural Punjab. Standard Urdu STT fails here; the phonetic array maps actual user speech patterns to inventory queries

---

## Architecture

```
React Frontend (port 3000)
        ↕ REST API
Express Backend (port 5000)
        ↕ Sequelize ORM
SQLite Database (database.sqlite)
        ↕ optional
Google Drive (encrypted backup sync)
```

The system is entirely local — no cloud dependency for core operation. Google Drive sync is manual and optional, used to back up the SQLite database across devices.

---

## Repository Structure

```
Almadina-Agro-ERP/
├── AlmadinaAgro.bat           # One-click launcher: starts backend → waits → starts frontend → opens browser
├── RunHidden.vbs              # Silent launcher (no terminal window) — used on warehouse tablet
├── database.sqlite            # SQLite database
├── backups/                   # Encrypted .enc backup files + Excel exports
├── backend/
│   ├── server.js              # Express app, route mounting, CORS, port fallback logic
│   ├── config/
│   │   ├── config.json        # Sequelize DB config (dev/test/prod)
│   │   └── drive-sync.json    # Google Drive sync state (lastSync, lastHash, isAuthenticated)
│   ├── controllers/
│   │   ├── productController.js       # CRUD + barcode, stock, bulk import via XLSX
│   │   ├── saleController.js          # Sales with receipt image upload
│   │   ├── customerController.js      # Customer ledger, credit tracking
│   │   ├── accountingController.js    # Double-entry ledger, journal entries, balance sheet
│   │   ├── analyticsController.js     # Sales trends, top products, revenue charts
│   │   ├── aiDetectionController.js   # Image-based product detection
│   │   ├── trainingController.js      # Upload training images for AI model
│   │   ├── driveController.js         # Google Drive push/pull/merge
│   │   ├── backupController.js        # Encrypted backup export/import
│   │   ├── authController.js          # Login (auth currently bypassed — see notes)
│   │   ├── paymentController.js       # Payment recording
│   │   └── auditController.js         # Audit trail
│   ├── models/
│   │   ├── index.js           # Sequelize setup, model associations, reloadSequelize()
│   │   ├── product.js
│   │   ├── customer.js
│   │   ├── sale.js / saleitem.js
│   │   ├── payment.js
│   │   ├── accountingentry.js / journalentry.js / journalentryline.js
│   │   ├── chartofaccounts.js / budget.js / accountspayable.js
│   │   ├── trainingimage.js / aimodel.js
│   │   └── audittrail.js / user.js
│   ├── routes/                # One route file per controller
│   ├── middleware/
│   │   ├── auth.js            # JWT protect middleware (currently bypassed with pass-through)
│   │   └── upload.js          # Multer config for image and file uploads
│   ├── utils/
│   │   ├── driveSync.js       # Google Drive OAuth2, push/pull/merge database
│   │   ├── encryption.js      # AES-192-CBC encrypt/decrypt using ENCRYPTION_KEY env var
│   │   ├── backup.js          # Scheduled backup, XLSX export, encrypted .enc export
│   │   ├── imageProcessor.js  # Custom image feature extraction (colour histogram, edges, texture, shape)
│   │   ├── analytics.js       # Analytics helper functions
│   │   └── helpers.js
│   ├── migrations/            # Sequelize migration files
│   ├── init-db.js             # One-time DB initialisation script
│   └── init-accounting.js     # Seeds Chart of Accounts
└── frontend/
    ├── src/
    │   ├── api/               # Axios calls — one file per domain (products, sales, customers, etc.)
    │   ├── components/        # Reusable UI: DataTable, Modal, VoiceSearch, FileUpload, ImagePreview
    │   ├── pages/             # Full pages: Dashboard, Products, Sales, Customers, Analytics, AI, Backup
    │   ├── features/          # Redux slices (auth, products, customers, sales, drive)
    │   ├── config/config.js   # API_URL, currency (PKR), thresholds, theme colours
    │   └── fonts/             # Jameel Noori Nastaleeq (Urdu font for receipts/invoices)
    └── public/index.html
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Redux Toolkit, Tailwind CSS |
| Backend | Node.js, Express |
| Database | SQLite via Sequelize ORM |
| Voice input | Web Speech API → custom phonetic array → SQL parser |
| AI detection | Custom image feature extraction (Sharp) — colour histogram, Sobel edge detection, texture, shape |
| Translation | `@vitalets/google-translate-api` proxied through backend to avoid browser CORS |
| Backup | AES-192-CBC encryption, XLSX export, Google Drive OAuth2 sync |
| PDF generation | PDFKit (invoices, balance sheets) |
| Launcher | Windows `.bat` + `.vbs` for tablet deployment |

---

## Key Files

### `backend/server.js`

Express entry point. Notable details:
- **Port fallback**: starts on port 5000 (or `PORT` env), and if that port is in use, automatically increments up to 5 tries before giving up — important for the tablet environment where ports may be occupied
- **CORS**: defaults to `localhost:3000/3001`, configurable via `CORS_ORIGINS` env var as a comma-separated list
- **Drive sync on startup/shutdown is disabled** — all sync is now manual via dashboard buttons (see commented-out code in startup block)
- Loads `.env` via dotenv and logs `ENCRYPTION_KEY` presence on startup (debug line — worth removing before sharing publicly)

### `backend/utils/driveSync.js`

Handles all Google Drive interaction. Requires two files at runtime (not committed):
- `backend/config/google-credentials.json` — OAuth2 client credentials downloaded from Google Cloud Console
- `backend/config/token.json` — generated on first auth, stores access/refresh tokens

Three sync modes:
- **Push** — uploads local `database.sqlite` to Drive, creates or updates `almadina-agro-db.sqlite`
- **Pull** — downloads Drive database and replaces local (closes Sequelize connection first, then reloads)
- **Merge** — downloads Drive database to a temp file, then merges records table-by-table using `updatedAt` comparison; newer record wins

SHA-256 hash of the database file is stored in `drive-sync.json` to detect whether anything has changed before pushing.

### `backend/utils/encryption.js`

AES-192-CBC encryption for backup files. Key is derived from `ENCRYPTION_KEY` environment variable using `scryptSync` with a static salt. Both `.enc` backup files in `backups/` and `backend/uploads/` are encrypted with this. If `ENCRYPTION_KEY` is not set, all backup operations will throw.

### `backend/utils/imageProcessor.js` (under devlopment)

Custom computer vision feature extractor — no external ML model. Uses Sharp to resize images to 224×224 and extracts:
- RGB colour histogram (binned)
- Sobel-like edge magnitude and direction features
- Texture features (local variance, contrast)
- Shape features (aspect ratio, contour approximation)

These feature vectors are stored per training image in the database. Detection compares cosine similarity between a query image's features and all stored training images. Threshold for a match is 0.3.

### `backend/controllers/accountingController.js`

Full double-entry accounting system: journal entries with debit/credit lines, chart of accounts, balance sheet generation (exported as PDF via PDFKit), P&L, accounts payable. Integrated with sales — every sale automatically creates the corresponding journal entry.

### `backend/middleware/auth.js`

**Currently a pass-through** — authentication is bypassed. The `protect` middleware calls `next()` immediately without checking any token. This was the intended state for local warehouse deployment (single trusted device), but should be re-enabled if the system is ever exposed to a network.

### `AlmadinaAgro.bat` / `RunHidden.vbs`

`AlmadinaAgro.bat` is the one-click launcher: starts `node backend/server.js`, waits 10 seconds, starts the React dev server in the `frontend/` directory, waits another 5 seconds, then opens `localhost:3000` in the default browser.

`RunHidden.vbs` runs the same `.bat` silently — no terminal window appears. This is how the system is deployed on the warehouse tablet so the UI just opens like a native app.

---

## Setup

### Prerequisites

- Node.js (v16+)
- Windows (for the `.bat` launcher; on other OS, run backend and frontend manually)

### Install

```bash
git clone https://github.com/msaym22/Almadina-Agro-ERP.git
cd Almadina-Agro-ERP

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Environment Variables

Create `backend/.env`:

```bash
# Required for backup encryption/decryption
ENCRYPTION_KEY=your-strong-secret-passphrase

# Optional — JWT secret (auth currently bypassed, but set for future use)
JWT_SECRET=your-jwt-secret

# Optional — override default port
PORT=5000
```

> Without `ENCRYPTION_KEY`, the server will start but all backup export/import operations will fail.

### Initialise the Database

```bash
cd backend
node init-db.js          # creates tables
node init-accounting.js  # seeds Chart of Accounts
```

### Run

**Windows (recommended):**
Double-click `AlmadinaAgro.bat` — it handles everything.

**Manual:**
```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && npm start
```

App opens at `http://localhost:3000`.

---

## Google Drive Sync Setup (Optional)

Used to back up the SQLite database across devices.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → enable **Google Drive API**
3. Create OAuth2 credentials (Desktop app type)
4. Download the credentials JSON and save as `backend/config/google-credentials.json`
5. In the app, go to **Settings → Google Drive** → click **Authenticate**
6. Paste the auth code from Google — this generates `backend/config/token.json`

After authenticating, use the **Push** and **Pull** buttons in the dashboard to sync manually. Auto-sync on startup/shutdown is disabled.

---

## Features

| Module | Description |
|---|---|
| Products | CRUD, barcode, bulk import via XLSX, stock tracking, low-stock alerts |
| Voice Search | Urdu speech → phonetic normalization → SQL query |
| AI Detection | Camera image → feature matching → product identification |
| AI Training | Upload reference images per product to train the detection model |
| Sales | POS-style sale entry, receipt image capture, invoice PDF generation |
| Customers | Ledger, credit limit, outstanding balance, purchase history |
| Payments | Payment recording against customer accounts |
| Accounting | Double-entry journal, chart of accounts, balance sheet PDF, P&L |
| Analytics | Sales trends, top products, revenue by period (password-protected) |
| Backup | Encrypted `.enc` export, XLSX export, import/restore |
| Drive Sync | Manual push/pull/merge with Google Drive |
| Translation | Urdu ↔ English translation proxy for product names |

---

## Known Issues / Notes

- **Authentication is disabled** — `auth.js` middleware is a pass-through. All routes are unprotected. Intended for single-device local use; must be re-enabled for any networked deployment.
- **`drive-sync.json` is committed** — contains `isAuthenticated: true` and the last sync hash. No secrets are in this file, but it reflects production state.

---

## Background

Built by Muhammad Saim. The warehouse previously ran entirely on shared memory and handwritten tallies — Ali Uncle, the warehouse manager, knew every transaction but nothing was recorded. The first software attempt failed because it assumed the user could read.

The second attempt was built backwards from the user: speech first, icons instead of text, dialect-aware phonetics. The system now processes all daily transactions and has been in continuous use at the Vehari warehouse.

The Voice-to-SQL engine and phonetic dialect layer are the technically novel parts of this project. The accounting module, Google Drive sync, and AI detection module were added in subsequent iterations as the warehouse's needs grew.
