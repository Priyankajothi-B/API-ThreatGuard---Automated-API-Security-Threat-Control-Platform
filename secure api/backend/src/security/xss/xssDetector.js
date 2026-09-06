const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<script/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["']?[^"'>]+["']?/gi, // e.g. onload=, onerror=, onclick=
  /<iframe/gi,
  /<svg[^>]*onload/gi,
  /document\.cookie/gi,
  /eval\s*\(/gi
];

function detectXss(req) {
  const inputs = [];

  if (req.query) inputs.push(...Object.values(req.query).map(v => String(v)));
  if (req.params) inputs.push(...Object.values(req.params).map(v => String(v)));
  if (req.body && typeof req.body === 'object') {
    inputs.push(...extractValuesRecursive(req.body));
  }

  for (const input of inputs) {
    if (!input || typeof input !== 'string') continue;

    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(input)) {
        return {
          type: 'XSS_MALICIOUS_INPUT',
          severity: 'HIGH',
          scoreContribution: 35,
          confidence: 95,
          reason: `Cross-Site Scripting (XSS) payload detected in request input: "${input.substring(0, 40)}..."`
        };
      }
    }
  }

  return null;
}

function extractValuesRecursive(obj) {
  let values = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      values = values.concat(extractValuesRecursive(obj[key]));
    } else {
      values.push(String(obj[key]));
    }
  }
  return values;
}

module.exports = { detectXss };
