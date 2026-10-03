'use strict';

const BLOCKED = new Set(['SIGILOSO', 'SECRETO', 'NAO_PUBLICAR']);

function evaluatePublication(input = {}) {
  const classification = String(input.classification || '').toUpperCase();
  const markers = Array.isArray(input.markers) ? input.markers.map(String) : [];
  if (!input.owner) return { decision: 'BLOCK', reason: 'owner_required' };
  if (!classification) return { decision: 'BLOCK', reason: 'classification_required' };
  if (BLOCKED.has(classification) || markers.some(marker => /NAO_PUBLICAR|SIGILOSO|SECRETO|SECRET/i.test(marker))) {
    return { decision: 'BLOCK', reason: 'protected_material' };
  }
  if (input.secretDetected === true) return { decision: 'BLOCK', reason: 'secret_detected' };
  return { decision: 'ALLOW', reason: 'publication_gate_pass' };
}

module.exports = { evaluatePublication };

