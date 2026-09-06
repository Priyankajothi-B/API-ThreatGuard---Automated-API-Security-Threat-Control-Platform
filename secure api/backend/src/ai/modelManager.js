const { activeAnomalyModel } = require('./anomalyModel');
const { getDataset, getStats } = require('./trainingDataManager');
const { predictThreat } = require('./threatPredictor');
const { generateAIExplanation } = require('./explanationEngine');

let modelMetadata = {
  version: '3.0.0-ML',
  algorithm: 'Isolation Forest & Probabilistic Ensemble',
  status: 'ACTIVE',
  trainedAt: new Date().toISOString(),
  trainingSamples: 120,
  featuresCount: 18,
  aiAvailable: true,
  fallbackReason: null
};

function trainModel() {
  try {
    const dataset = getDataset();
    const success = activeAnomalyModel.train(dataset);
    
    if (success) {
      modelMetadata.status = 'ACTIVE';
      modelMetadata.aiAvailable = true;
      modelMetadata.trainedAt = new Date().toISOString();
      modelMetadata.trainingSamples = dataset.length;
      modelMetadata.fallbackReason = null;
      return { success: true, metadata: modelMetadata };
    } else {
      modelMetadata.status = 'FALLBACK';
      modelMetadata.aiAvailable = false;
      modelMetadata.fallbackReason = 'Insufficient training dataset';
      return { success: false, reason: modelMetadata.fallbackReason };
    }
  } catch (error) {
    modelMetadata.status = 'FALLBACK';
    modelMetadata.aiAvailable = false;
    modelMetadata.fallbackReason = error.message;
    return { success: false, reason: error.message };
  }
}

function retrainModel() {
  const parts = modelMetadata.version.split('.');
  const patch = parseInt(parts[2] || '0', 10) + 1;
  modelMetadata.version = `${parts[0]}.${parts[1]}.${patch}-ML`;
  return trainModel();
}

function getModelMetadata() {
  const stats = getStats();
  return {
    ...modelMetadata,
    datasetStats: stats
  };
}

function runAIInference(telemetry = {}, behavior = {}, profile = {}, reputation = {}) {
  // Graceful Fallback Guard
  if (!modelMetadata.aiAvailable) {
    return {
      aiAvailable: false,
      fallbackReason: modelMetadata.fallbackReason || 'AI layer in fallback mode',
      anomalyScore: 0,
      threatProbability: 0,
      confidence: 0,
      explanation: 'AI layer unavailable. Gateways operating under Phase 1 + Phase 2 deterministic security policies.'
    };
  }

  try {
    const prediction = predictThreat(telemetry, behavior, profile, reputation);
    const explanationObj = generateAIExplanation(prediction, telemetry, behavior, profile);

    return {
      aiAvailable: true,
      anomalyScore: prediction.anomalyResult?.anomalyScore || 0,
      anomalyLevel: prediction.anomalyResult?.anomalyLevel || 'NORMAL',
      threatProbability: prediction.threatProbability,
      predictedThreatLevel: prediction.predictedThreatLevel,
      predictedThreatTypes: prediction.predictedThreatTypes,
      confidence: prediction.confidence,
      contributingFeatures: prediction.anomalyResult?.contributingFeatures || [],
      supportingEvidence: prediction.supportingEvidence,
      explanation: explanationObj.narrative,
      explanationDetails: explanationObj
    };
  } catch (error) {
    console.error('AI Inference Error (Fallback Triggered):', error.message);
    return {
      aiAvailable: false,
      fallbackReason: `Inference error: ${error.message}`,
      anomalyScore: 0,
      threatProbability: 0,
      confidence: 0,
      explanation: 'AI inference error encountered. Fallback to deterministic security controls.'
    };
  }
}

// Initial train on startup
trainModel();

module.exports = {
  trainModel,
  retrainModel,
  getModelMetadata,
  runAIInference
};
