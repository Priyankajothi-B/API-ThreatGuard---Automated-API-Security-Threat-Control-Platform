const { FEATURE_NAMES } = require('./featureExtractor');

// Lightweight Isolation Forest / Statistical Ensemble Model in Pure JS
class IsolationTree {
  constructor(heightLimit) {
    this.heightLimit = heightLimit;
    this.tree = null;
  }

  fit(data, currentDepth = 0) {
    if (currentDepth >= this.heightLimit || data.length <= 1) {
      return { type: 'leaf', size: data.length };
    }

    const numFeatures = data[0].length;
    const featureIdx = Math.floor(Math.random() * numFeatures);
    
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const row of data) {
      const val = row[featureIdx];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    if (minVal === maxVal) {
      return { type: 'leaf', size: data.length };
    }

    const splitVal = minVal + Math.random() * (maxVal - minVal);
    const leftData = [];
    const rightData = [];

    for (const row of data) {
      if (row[featureIdx] < splitVal) leftData.push(row);
      else rightData.push(row);
    }

    return {
      type: 'node',
      featureIdx,
      splitVal,
      left: this.fit(leftData, currentDepth + 1),
      right: this.fit(rightData, currentDepth + 1)
    };
  }

  pathLength(vector, node = this.tree, currentDepth = 0) {
    if (!node || node.type === 'leaf') {
      return currentDepth + (node && node.size > 1 ? Math.log(node.size) : 0);
    }
    if (vector[node.featureIdx] < node.splitVal) {
      return this.pathLength(vector, node.left, currentDepth + 1);
    } else {
      return this.pathLength(vector, node.right, currentDepth + 1);
    }
  }
}

class IsolationForestModel {
  constructor(numTrees = 25, sampleSize = 100) {
    this.numTrees = numTrees;
    this.sampleSize = sampleSize;
    this.trees = [];
    this.isTrained = false;
    this.baselineMeans = [];
    this.baselineStds = [];
  }

  train(dataset) {
    if (!dataset || dataset.length < 10) {
      this.isTrained = false;
      return false;
    }

    const vectors = dataset.map(d => d.features);
    const numFeatures = vectors[0].length;

    // Calculate baseline means & standard deviations for feature contribution analysis
    this.baselineMeans = new Array(numFeatures).fill(0);
    this.baselineStds = new Array(numFeatures).fill(0);

    for (let f = 0; f < numFeatures; f++) {
      const vals = vectors.map(v => v[f]);
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = sum / vals.length;
      const varSum = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
      const std = Math.sqrt(varSum / vals.length) || 1;
      this.baselineMeans[f] = mean;
      this.baselineStds[f] = std;
    }

    this.trees = [];
    const heightLimit = Math.ceil(Math.log2(Math.min(this.sampleSize, vectors.length)));

    for (let i = 0; i < this.numTrees; i++) {
      const sample = [];
      const k = Math.min(this.sampleSize, vectors.length);
      for (let j = 0; j < k; j++) {
        const randIdx = Math.floor(Math.random() * vectors.length);
        sample.push(vectors[randIdx]);
      }

      const treeObj = new IsolationTree(heightLimit);
      treeObj.tree = treeObj.fit(sample);
      this.trees.push(treeObj);
    }

    this.isTrained = true;
    return true;
  }

  predict(vector) {
    if (!this.isTrained || this.trees.length === 0) {
      return {
        anomalyScore: 0,
        anomalyLevel: 'NORMAL',
        modelConfidence: 0,
        contributingFeatures: [],
        fallback: true,
        reason: 'ML Model not trained yet'
      };
    }

    let avgPathLength = 0;
    for (const tree of this.trees) {
      avgPathLength += tree.pathLength(vector);
    }
    avgPathLength /= this.trees.length;

    // Standard expected path length formula c(n) for n = sampleSize
    const n = this.sampleSize;
    const cN = 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
    
    // Anomaly score s = 2 ^ (-avgPath / c(n))
    const rawScore = Math.pow(2, -avgPathLength / cN);
    const anomalyScore = Math.min(100, Math.max(0, Math.round(rawScore * 100)));

    let anomalyLevel = 'NORMAL';
    if (anomalyScore >= 80) anomalyLevel = 'HIGHLY_ANOMALOUS';
    else if (anomalyScore >= 60) anomalyLevel = 'ANOMALOUS';
    else if (anomalyScore >= 40) anomalyLevel = 'SUSPICIOUS';

    // Identify top contributing features via Z-score deviation from baseline normal
    const featureDeviations = [];
    vector.forEach((val, fIdx) => {
      const mean = this.baselineMeans[fIdx] || 0;
      const std = this.baselineStds[fIdx] || 1;
      const zScore = Math.abs((val - mean) / std);
      if (zScore > 1.2 && val > 0) {
        featureDeviations.push({
          name: FEATURE_NAMES[fIdx],
          zScore: parseFloat(zScore.toFixed(2)),
          value: val,
          baselineMean: parseFloat(mean.toFixed(2))
        });
      }
    });

    featureDeviations.sort((a, b) => b.zScore - a.zScore);
    const contributingFeatures = featureDeviations.slice(0, 4).map(fd => fd.name);

    const modelConfidence = Math.min(95, Math.max(70, 75 + contributingFeatures.length * 5));

    return {
      anomalyScore,
      anomalyLevel,
      modelConfidence,
      contributingFeatures,
      featureDeviations: featureDeviations.slice(0, 4),
      fallback: false
    };
  }
}

const activeAnomalyModel = new IsolationForestModel();

module.exports = {
  IsolationForestModel,
  activeAnomalyModel
};
