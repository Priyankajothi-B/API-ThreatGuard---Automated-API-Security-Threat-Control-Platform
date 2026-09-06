# Architecture Documentation — AegisGuard API Security Gateway

## System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  API CLIENT / ATTACKER                            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             SECURITY GATEWAY MIDDLEWARE                           |
|                                                                                   |
|  1. Request Logger & Timing Start                                                |
|  2. JWT Authentication Validation (Missing, Expired, Malformed, Invalid)          |
|  3. Authorization & BOLA Detector (Broken Object Level Authorization)             |
|  4. Input Validation & XSS Detector                                               |
|  5. Multi-Signal SQL Injection Detector (Keywords + Quote Imbalance + Patterns)   |
|  6. Progressive Rate Abuse Engine (ALLOW -> MONITOR -> RATE LIMIT -> TEMP BLOCK)  |
|  7. Behavioral Enumeration Detector (High frequency & 404/403 anomaly analysis)   |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                   RISK ENGINE                                     |
|  - Risk Score: 0 - 100                                                            |
|  - Confidence Score: 0 - 100%                                                     |
|  - Transparent Explanation (Why Allowed / Why Blocked breakdown)                  |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                 DECISION ENGINE                                   |
+----------------------------------------+------------------------------------------+
                                         |
                       +-----------------+-----------------+
                       |                 |                 |
                       v                 v                 v
                   [ ALLOW ]       [ RATE LIMIT ]      [ BLOCK ]
                       |                 |                 |
                       v                 v                 v
                   Demo API        429 Response      403 Response
                       |                 |                 |
                       +-----------------+-----------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                             EVENT / INCIDENT ENGINE                               |
|  - MongoDB Document Store                                                         |
|  - Socket.IO Real-Time Stream                                                     |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              SOC DASHBOARD (REACT)                                |
|  - Overview Dashboard (KPIs, Posture Score 0-100, Threat Map)                      |
|  - Live Events (Stream, Event Inspector Drawer with "Why Allowed/Blocked")         |
|  - Incidents View (Grouped attack sessions by IP/User)                            |
|  - Endpoint Inventory (Risk status heatmap, request/threat rates) font-mono       |
|  - Security Policies (Dynamic rate limits, thresholds, module toggles)            |
|  - Attack Simulator Panel (1-Click attack triggers & live visual feedback)        |
|  - Audit Logs (Manual overrides, whitelist changes, policy edits)                 |
+-----------------------------------------------------------------------------------+
```

---

## Technical Component Breakdown

### 1. Express Security Gateway (`backend/src/security/gateway.js`)
Positions itself inline before protected API routes (`/api/*`). Intercepts requests, attaches explicit security response headers (`X-Security-Gateway`, `X-Security-Risk-Score`, `X-Security-Decision`, `X-Gateway-Latency-ms`), executes inspection modules in sub-5ms, and computes final decision.

### 2. Multi-Signal Security Detectors (`backend/src/security/*`)
- **Authentication Detector (`auth/jwtValidator.js`)**: Validates Bearer JWT tokens, signature integrity, expiration timestamps, and missing headers.
- **BOLA Detector (`auth/bolaDetector.js`)**: Enforces Broken Object Level Authorization rules by matching authenticated user IDs against requested resource params.
- **Multi-Signal SQLi Detector (`injection/sqliDetector.js`)**: Combines keyword density, quote imbalance, tautology patterns (`' OR 1=1`), and comment syntax.
- **XSS Detector (`xss/xssDetector.js`)**: Scans user input for script tags, event handler attributes (`onerror=`, `onload=`), and URI schemes.
- **Progressive Rate Limiter (`rateLimit/rateLimiter.js`)**: Enforces progressive escalation (`ALLOW` -> `MONITOR` -> `RATE_LIMIT 429` -> `TEMP BLOCK 403`).
- **Behavioral Enumeration Detector (`enumeration/enumerationDetector.js`)**: Tracks unique object ID lookups and frequency anomalies on parameterized routes.

### 3. Risk & Confidence Scoring Engine (`backend/src/security/risk/riskScorer.js`)
Aggregates risk score contributions (0-100 score capped) and calculates confidence percentage (0-100%). Generates human-readable "Why Allowed" and "Why Blocked" transparent rationale.

### 4. Real-Time Telemetry Stream (`backend/src/services/socketService.js`)
Broadcasts security events instantly to the React SOC Dashboard via Socket.IO.

### 5. SOC Dashboard (`frontend/src/`)
Dark SOC-inspired cybersecurity operations center built with React + Vite, Tailwind CSS, and Recharts. Features a 1-click Attack Simulator panel.
