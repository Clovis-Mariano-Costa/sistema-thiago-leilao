'use strict';

const CLASSIFICATIONS = new Set(['PUBLIC', 'SIGILOSO', 'SECRETO']);
const BLOCKED = new Set(['SIGILOSO', 'SECRETO']);
const BLOCK_MARKER = /(?:^|[^A-Z0-9])(?:NAO_PUBLICAR|NÃO_PUBLICAR|SIGILOSO|SECRETO|SECRET)(?:$|[^A-Z0-9])/i;

function evaluatePublication(input = {}) {
  const owner = String(input.owner || '').trim();
  const classification = String(input.classification || '').trim().toUpperCase();
  const markers = Array.isArray(input.markers) ? input.markers.map(value => String(value || '')) : [];

  if (!owner) return { decision: 'BLOCK', reason: 'owner_required' };
  if (!classification) return { decision: 'BLOCK', reason: 'classification_required' };
  if (!CLASSIFICATIONS.has(classification)) return { decision: 'BLOCK', reason: 'classification_unknown' };
  if (BLOCKED.has(classification)) return { decision: 'BLOCK', reason: 'protected_material' };
  if (markers.some(marker => BLOCK_MARKER.test(marker))) return { decision: 'BLOCK', reason: 'protected_marker' };
  if (input.secretDetected === true) return { decision: 'BLOCK', reason: 'secret_detected' };

  return { decision: 'ALLOW', reason: 'publication_gate_pass' };
}

module.exports = { CLASSIFICATIONS, evaluatePublication };
