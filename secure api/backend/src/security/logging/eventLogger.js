const SecurityEvent = require('../../models/SecurityEvent');
const Incident = require('../../models/Incident');
const { broadcastEvent } = require('../../services/socketService');
const mongoose = require('mongoose');

async function logSecurityEvent(telemetry) {
  try {
    // Broadcast real-time Socket.IO event for SOC Dashboard immediately
    broadcastEvent('security-event', telemetry);

    // Save to DB if connected
    if (mongoose.connection.readyState === 1) {
      const eventDoc = new SecurityEvent(telemetry);
      await eventDoc.save();

      // If threat is HIGH or CRITICAL, update or create grouped Incident
      if (telemetry.riskScore >= 60 || telemetry.decision === 'BLOCK' || telemetry.decision === 'RATE_LIMIT') {
        await correlateIncident(eventDoc);
      }
      return eventDoc;
    }
  } catch (error) {
    console.error('Error logging security event:', error.message);
  }
}

async function correlateIncident(eventDoc) {
  try {
    if (mongoose.connection.readyState !== 1) return;

    const ip = eventDoc.ipAddress;
    const windowStart = new Date(Date.now() - 30 * 60 * 1000); // 30 mins window

    let incident = await Incident.findOne({
      ipAddress: ip,
      status: { $in: ['ACTIVE', 'INVESTIGATING'] },
      lastSeen: { $gte: windowStart }
    });

    if (incident) {
      incident.eventCount += 1;
      incident.events.push(eventDoc._id);
      if (eventDoc.riskScore > incident.highestRiskScore) {
        incident.highestRiskScore = eventDoc.riskScore;
      }
      incident.lastSeen = Date.now();
      await incident.save();
    } else {
      const primaryThreat = (eventDoc.threatTypes && eventDoc.threatTypes.length > 0) 
        ? eventDoc.threatTypes[0] 
        : 'HIGH_RISK_ACTIVITY';

      incident = new Incident({
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
        ipAddress: ip,
        userId: eventDoc.userId || 'anonymous',
        primaryThreat,
        eventCount: 1,
        events: [eventDoc._id],
        highestRiskScore: eventDoc.riskScore,
        status: 'ACTIVE'
      });
      await incident.save();
    }

    broadcastEvent('incident-update', incident);
  } catch (error) {
    console.error('Error correlating incident:', error.message);
  }
}

module.exports = { logSecurityEvent };
