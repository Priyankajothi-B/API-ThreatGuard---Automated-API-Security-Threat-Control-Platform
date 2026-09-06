# Detection Engine Documentation

## 1. Authentication & JWT Validation
- **Missing Token**: `scoreContribution: 30`, `severity: HIGH`, `decision: BLOCK`
- **Invalid/Expired Signature**: `scoreContribution: 35`, `severity: HIGH`, `decision: BLOCK`

## 2. Authorization / BOLA (Broken Object Level Authorization)
- Checks ownership of resource parameters (`req.params.id`, `req.query.userId`).
- Compares user subject ID from JWT token.
- `scoreContribution: 35`, `severity: HIGH`, `confidence: 90%`.

## 3. Multi-Signal SQL Injection
- Signal 1: SQL Keyword density (`SELECT`, `UNION`, `DROP`, `INFORMATION_SCHEMA`).
- Signal 2: Tautology patterns (`' OR 1=1 --`, `' OR 'a'='a'`).
- Signal 3: Comment syntax & quote termination (`' --`, `/*`).
- `scoreContribution: 40`, `severity: CRITICAL`, `confidence: 85-100%`.

## 4. XSS & Malicious Input
- Vector patterns: `<script>`, `onerror=`, `onload=`, `javascript:`, `eval()`.
- `scoreContribution: 35`, `severity: HIGH`, `confidence: 95%`.

## 5. Progressive Rate Abuse
- **Level 1 (< 30 req/min)**: ALLOW
- **Level 2 (30 - 50 req/min)**: ELEVATED / MONITOR (+15 risk)
- **Level 3 (51 - 100 req/min)**: RATE_LIMIT 429 (+25 risk)
- **Level 4 (> 100 req/min)**: TEMPORARY IP BLOCK 403 (+40 risk)

## 6. Behavioral Resource Enumeration
- Monitors unique object IDs requested within rolling window.
- `scoreContribution: 25`, `severity: HIGH`, `confidence: 80-95%`.
