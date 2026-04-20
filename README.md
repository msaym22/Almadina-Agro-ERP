# Almadina Agro ERP — Voice-to-SQL Inventory System

A production MERN stack ERP built for a family agricultural warehouse in Vehari, Punjab.
Currently processing **70,000 PKR in daily transactions**.

The system was designed around one hard constraint: warehouse staff are low-literacy
Punjabi speakers who cannot use text-based interfaces. Everything in the architecture
follows from that.

## Core Features

### Voice-to-SQL (Urdu/Punjabi dialect)

The central feature. Workers speak inventory queries in Urdu and the system translates,
normalises, and resolves them to SQL queries against a SQLite database.

The NLP pipeline handles:
- **Dialect variation** — a phonetic correction layer maps the actual speech patterns
  of Vehari warehouse workers to canonical terms. For example, name variants like
  `saeem`, `saam`, `saeem` → `Saim`; crop terms like `feeder` resolve regardless
  of how the speaker pronounces them.
- **Translation fallback chain** — the backend proxy tries multiple translation
  providers in order (Google Translate API, LibreTranslate, Argos OpenTech, MyMemory)
  with timeouts, so the system degrades gracefully without network dependencies.
- **Trailing-letter preservation** — product names like "belt d" are split so the
  Urdu root is translated while the trailing technical identifier is kept intact.

### Visual Crop Icons

Text fields are replaced with icon-based navigation so workers can find products by
crop type without reading. This was the first design decision after Ali Uncle (the
warehouse manager) set down the text-based tablet without using it.

### Image-Based Product Detection

A trainable computer vision module lets users photograph a product and match it to
inventory. The backend extracts image features, compares them against trained models
per product, and returns ranked matches with confidence scores. Training images are
uploaded per product and aggregated into a per-product model.

### Full Accounting Layer

Double-entry bookkeeping with journal entries, chart of accounts, accounts payable,
budget tracking, and balance sheet export. The accounting module is password-protected
and separate from the warehouse UI.

### Google Drive Sync + Encrypted Backups

Inventory and transaction data syncs automatically to Google Drive. Local backups are
AES-encrypted (`.enc` files). The `backups/` folder in the repo contains real
production backup history from July 2025 onward — this system has been running live.

### Excel Migration

Bulk import from `.xlsx` files via Multer + stream parsing, used to onboard legacy
paper records. Schema validation and duplicate checking run before commit.

## Stack

| Layer      | Tech                                               |
|------------|----------------------------------------------------|
| Frontend   | React.js, Redux Toolkit, Tailwind CSS              |
| Backend    | Node.js / Express                                  |
| Database   | SQLite (via Sequelize)                             |
| NLP        | Web Speech API → phonetic correction → translation proxy → SQL |
| Vision     | Custom image feature extraction + cosine similarity |
| Auth       | JWT (httpOnly cookies)                             |
| Sync       | Google Drive API, AES-256 encryption               |
| Fonts      | Jameel Noori Nastaleeq (Urdu rendering)            |

## Running Locally

Prerequisites: Node.js installed.

```bash
git clone https://github.com/msaym22/Almadina-Agro-ERP.git
cd Almadina-Agro-ERP
npm install
cd frontend && npm install && cd backend && npm install
```

Then double-click `AlmadinaAgro.bat` — it starts the backend, waits for
initialization, launches the frontend, and opens `localhost:3000`.

`RunHidden.vbs` runs the same launcher silently (no terminal window), used for
deployment on the warehouse tablet.

## Demo

[Watch on YouTube](https://youtu.be/lzolfIsOi2g)
