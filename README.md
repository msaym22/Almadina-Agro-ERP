# Almadina Agro ERP — Voice-to-SQL Inventory System

A production MERN stack ERP built for a family agricultural warehouse in Vehari, Punjab.
Currently processing **70,000 PKR in daily transactions**.

The system was designed around a specific constraint: the warehouse staff are low-literacy
Punjabi speakers who could not use text-based interfaces. The solution was a
**Voice-to-SQL engine** that accepts spoken Urdu commands and queries a SQLite inventory
database directly — no typing required.

## The NLP Problem

Standard Urdu speech recognition fails in rural Punjab because dialect varies significantly
by speaker and region. A word like "feeder" sounds different depending on who says it.

To handle this, I built a **phonetic array** that maps the dialect variations of the actual
users — not standardised Urdu — to their inventory queries. The system resolves phonetic
ambiguity before passing commands to the SQL layer.

Additionally, the UI uses **visual crop icons** instead of text fields, so workers can
navigate inventory by crop type without reading.

## Stack

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Frontend | React.js                                    |
| Backend  | Node.js / Express                           |
| Database | SQLite                                      |
| NLP      | Custom phonetic array (Urdu dialect mapping)|
| Voice    | Web Speech API → SQL parser                 |

## Running Locally

Prerequisites: Node.js installed.

```bash
git clone https://github.com/msaym22/Almadina-Agro-ERP.git
cd Almadina-Agro-ERP
npm install
cd frontend && npm install && cd ..
```

Then double-click `AlmadinaAgro.bat` — it starts the backend, waits for
initialization, launches the frontend, and opens `localhost:3000` automatically.

> `RunHidden.vbs` runs the same launcher silently (no terminal window),
> used for deployment on the warehouse tablet.

## Demo

[Watch on YouTube](https://youtu.be/lzolfIsOi2g)
