const { extractFeatures } = require('./featureExtractor');

const dataset = []; // Array of { eventId, timestamp, features, label, detectorResults, riskScore, decision }
const MAX_DATASET_SIZE = 5000;

function seedInitialDataset() {
  if (dataset.length > 0) return;

  // Seed 80 normal requests
  for (let i = 0; i < 80; i++) {
    const freq = Math.floor(1 + Math.random() * 8);
    const endpoints = Math.floor(1 + Math.random() * 3);
    dataset.push({
      eventId: `SEED-NORM-${i}`,
      timestamp: Date.now() - (i * 60000),
      features: [freq, endpoints, 0, 0, freq, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.2, 0, 0, 0],
      label: 'NORMAL',
      decision: 'ALLOW',
      riskScore: 10
    });
  }

  // Seed 20 suspicious requests
  for (let i = 0; i < 20; i++) {
    const freq = Math.floor(25 + Math.random() * 15);
    const endpoints = Math.floor(4 + Math.random() * 3);
    dataset.push({
      eventId: `SEED-SUSP-${i}`,
      timestamp: Date.now() - (i * 120000),
      features: [freq, endpoints, 3, 2, 5, 1, 2, 0, 0.35, 3, 2, 45, 55, 1, 0.6, 2, 0, 0],
      label: 'SUSPICIOUS',
      decision: 'MONITOR',
      riskScore: 55
    });
  }

  // Seed 20 malicious requests
  for (let i = 0; i < 20; i++) {
    const freq = Math.floor(50 + Math.random() * 30);
    const endpoints = Math.floor(6 + Math.random() * 4);
    dataset.push({
      eventId: `SEED-MAL-${i}`,
      timestamp: Date.now() - (i * 180000),
      features: [freq, endpoints, 6, 5, 2, 4, 3, 2, 0.7, 4, 3, 85, 90, 3, 0.85, 4, 1, 1],
      label: 'MALICIOUS',
      decision: 'BLOCK',
      riskScore: 90
    });
  }
}

function addSample(telemetry, behavior = {}, profile = {}, reputation = {}, overrideLabel = null) {
  const { vector } = extractFeatures(telemetry, behavior, profile, reputation);
  
  let label = overrideLabel;
  if (!label) {
    if (telemetry.decision === 'BLOCK' || telemetry.riskScore >= 80) label = 'MALICIOUS';
    else if (telemetry.decision === 'RATE_LIMIT' || telemetry.riskScore >= 40) label = 'SUSPICIOUS';
    else label = 'NORMAL';
  }

  const sample = {
    eventId: telemetry.requestId || `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: Date.now(),
    features: vector,
    label,
    detectorResults: telemetry.threatTypes || [],
    riskScore: telemetry.riskScore || 0,
    decision: telemetry.decision || 'ALLOW'
  };

  dataset.push(sample);
  if (dataset.length > MAX_DATASET_SIZE) {
    dataset.shift(); // Maintain sliding dataset window
  }

  return sample;
}

function recordAnalystFeedback(eventId, analystLabel) {
  const sample = dataset.find(s => s.eventId === eventId);
  if (sample) {
    sample.label = analystLabel; // e.g. FALSE_POSITIVE, MALICIOUS, NORMAL
    sample.analystOverridden = true;
    return true;
  }
  return false;
}

function getDataset() {
  if (dataset.length === 0) seedInitialDataset();
  return dataset;
}

function getStats() {
  const data = getDataset();
  const normalCount = data.filter(d => d.label === 'NORMAL').length;
  const suspiciousCount = data.filter(d => d.label === 'SUSPICIOUS').length;
  const maliciousCount = data.filter(d => d.label === 'MALICIOUS').length;
  const falsePositiveCount = data.filter(d => d.label === 'FALSE_POSITIVE').length;

  return {
    totalSamples: data.length,
    normalCount,
    suspiciousCount,
    maliciousCount,
    falsePositiveCount,
    falsePositiveRate: data.length > 0 ? parseFloat(((falsePositiveCount / data.length) * 100).toFixed(1)) : 0
  };
}

seedInitialDataset();

module.exports = {
  addSample,
  recordAnalystFeedback,
  getDataset,
  getStats,
  seedInitialDataset
};
