const SQL_KEYWORDS = [
  'SELECT', 'UNION', 'INSERT', 'DELETE', 'UPDATE', 'DROP', 'ALTER', 'CREATE',
  'TRUNCATE', 'EXEC', 'DECLARE', 'CAST', 'CONCAT', 'CHAR', 'VERSION', 'SLEEP',
  'BENCHMARK', 'INFORMATION_SCHEMA', 'SYS.TABLES'
];

const TAUTOLOGY_PATTERNS = [
  /('|\")\s*or\s*('|\")?\d+('|\")?\s*=\s*('|\")?\d+/i,
  /('|\")\s*or\s*('|\")?[a-z]+('|\")?\s*=\s*('|\")?[a-z]+/i,
  /\bor\s+1\s*=\s*1\b/i,
  /\bor\s+true\b/i,
  /'\s*=\s*'/i,
  /--/
];

const COMMENT_QUOTE_PATTERNS = [
  /'\s*--;/i,
  /'\s*--/i,
  /\/\*.*?\*\//s,
  /;/
];

function detectSqlInjection(req) {
  const inputs = [];

  if (req.query && Object.keys(req.query).length > 0) {
    inputs.push(...Object.values(req.query).map(v => String(v)));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    inputs.push(...Object.values(req.params).map(v => String(v)));
  }
  if (req.body && typeof req.body === 'object') {
    inputs.push(...extractValuesRecursive(req.body));
  }

  let totalSignalScore = 0;
  const detectedSignals = [];

  for (const input of inputs) {
    if (!input || typeof input !== 'string') continue;
    const uppercaseInput = input.toUpperCase();

    // Signal 1: Keyword density
    let keywordCount = 0;
    for (const keyword of SQL_KEYWORDS) {
      if (uppercaseInput.includes(keyword)) {
        keywordCount++;
      }
    }
    if (keywordCount >= 2) {
      totalSignalScore += 25;
      detectedSignals.push(`Multiple SQL keywords density (${keywordCount} keywords)`);
    } else if (keywordCount === 1 && (uppercaseInput.includes('UNION') || uppercaseInput.includes('DROP'))) {
      totalSignalScore += 30;
      detectedSignals.push(`High-risk SQL keyword (${uppercaseInput.includes('UNION') ? 'UNION' : 'DROP'})`);
    }

    // Signal 2: Tautologies & Logic Bypasses
    for (const pattern of TAUTOLOGY_PATTERNS) {
      if (pattern.test(input)) {
        totalSignalScore += 35;
        detectedSignals.push(`Tautology/Logic bypass pattern detected: "${input.substring(0, 30)}..."`);
        break;
      }
    }

    // Signal 3: Quote Imbalance & Comment syntax
    for (const pattern of COMMENT_QUOTE_PATTERNS) {
      if (pattern.test(input)) {
        totalSignalScore += 20;
        detectedSignals.push(`Suspicious SQL comment/quote termination pattern`);
        break;
      }
    }
  }

  if (totalSignalScore > 0) {
    const confidence = Math.min(100, Math.max(85, totalSignalScore + 50));
    const scoreContribution = Math.min(40, totalSignalScore);
    
    return {
      type: 'SQL_INJECTION',
      severity: scoreContribution >= 35 ? 'CRITICAL' : 'HIGH',
      scoreContribution,
      confidence,
      reason: `Multi-signal SQL Injection indicators detected: ${detectedSignals.join('; ')}`
    };
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

module.exports = { detectSqlInjection };
