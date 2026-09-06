# AEGISGUARD — INTELLIGENT API SECURITY GATEWAY & THREAT CONTROL SYSTEM

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-v4-black.svg)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-white.svg)](https://socket.io)
[![Test Coverage](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)]()

> **Production-Grade Hackathon API Security Gateway** positioned inline between API clients and backend services. Inspects, authenticates, validates inputs, detects threats, calculates transparent risk scores, enforces automated actions, and streams real-time telemetry to a SOC-inspired dashboard.

---

## 🌟 Architecture Highlights

```
API CLIENT  -->  SECURITY GATEWAY (Auth + BOLA + SQLi + XSS + Rate Limit + Enumeration)
                        │
                        ▼
                  RISK ENGINE (Score 0-100, Confidence %, Explanations)
                        │
                        ▼
                 DECISION ENGINE (ALLOW | MONITOR | RATE_LIMIT | BLOCK)
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    Demo API      429 Response    403 Response
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
            MongoDB & Socket.IO Telemetry
                        │
                        ▼
            React SOC Security Dashboard
```

---

## 🚀 Key Features

1. **Modular Gateway Pipeline**: Sub-5ms latency middleware intercepting all API traffic.
2. **Explicit Security Headers**: Attaches `X-Security-Gateway: Active`, `X-Security-Request-ID`, `X-Security-Risk-Score`, `X-Security-Decision`, and `X-Gateway-Latency-ms`.
3. **Multi-Signal SQL Injection**: Analyzes keyword density, tautologies (`' OR 1=1`), and quote imbalances.
4. **BOLA / Authorization Protection**: Detects object ownership violations (User A accessing User B resources).
5. **Behavioral Enumeration Detection**: Tracks unique object ID lookups & anomaly rates over sliding windows.
6. **Progressive Rate Limiting**: `ALLOW` → `MONITOR` → `RATE_LIMIT (429)` → `TEMPORARY IP BLOCK (403)`.
7. **Transparent Risk & Confidence Scoring**: Explains WHY a request was allowed or blocked with granular factor breakdowns.
8. **Interactive SOC Dashboard**: React + Vite UI with live streams, endpoint risk heatmaps, policy sliders, audit trails, and a 1-click **Attack Simulator**.

---

## 🛠️ Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm start
```
* Backend starts at `http://localhost:5000` (runs with embedded in-memory MongoDB automatically if no `MONGODB_URI` is provided).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Dashboard runs at `http://localhost:3000`.

### 3. Run Automated Tests
```bash
cd backend
npm test
```

---

## 🧪 Demo Scenarios (1-Click Attack Simulator)

Go to **Attack Simulator** in the SOC Dashboard:

| # | Scenario | Payload / Behavior | Action Taken |
|---|---|---|---|
| 1 | Legitimate Request | `GET /api/products` | `ALLOW (200 OK)` |
| 2 | Missing JWT | `GET /api/profile` (no header) | `BLOCK (403 Forbidden)` |
| 3 | Invalid JWT | `GET /api/profile` (bad signature) | `BLOCK (403 Forbidden)` |
| 4 | BOLA Violation | `user_1` accessing `/api/users/user_2` | `BLOCK (403 Forbidden)` |
| 5 | Multi-Signal SQLi | `GET /api/search?q=laptop' OR 1=1 --` | `BLOCK (403 Forbidden)` |
| 6 | XSS Payload | `POST /api/orders` with `<script>` | `BLOCK (403 Forbidden)` |
| 7 | Progressive Rate Abuse | 35 burst requests in short window | `RATE_LIMIT (429)` |
| 8 | Behavioral Enumeration | Probing 7 unique user IDs in 60s | `MONITOR / BLOCK` |
| 9 | Correlated Attack Chain | SQLi + Enumeration + XSS chain | `BLOCK + INCIDENT CREATED` |

---

## 📄 Documentation
- [Architecture Overview](docs/architecture.md)
- [Detection Engine Specifications](docs/detection-engine.md)
