const test = require('node:test');
const assert = require('node:assert/strict');
const { requestAccess, approveAccess, authorizeRead, safeAlert } = require('../security/guardia-policy');
const { evaluatePublication } = require('../security/publication-gates');

test('Guardia exige propósito, aprovação independente e expiração', () => {
  const request = requestAccess({
    actorId: 'synthetic-user',
    resourceId: 'synthetic-resource',
    classification: 'SIGILOSO',
    purpose: 'synthetic-review',
    requestedAt: 100,
    expiresAt: 200
  });
  assert.equal(request.state, 'REQUESTED');
  assert.equal(approveAccess(request, { approverId: 'synthetic-user', reauthenticated: true, approvedAt: 110 }).state, 'BLOCKED');
  const active = approveAccess(request, { approverId: 'synthetic-reviewer', reauthenticated: true, approvedAt: 110 });
  assert.equal(active.state, 'ACTIVE');
  assert.equal(authorizeRead(active, 150).allowed, true);
  assert.equal(authorizeRead(active, 200).allowed, false);
});

test('Guardia nunca inclui valor secreto no alerta', () => {
  const alert = safeAlert({ eventType: 'SECRET_READ_ATTEMPT', actorId: 'synthetic-user', resourceId: 'synthetic-secret', classification: 'SECRETO', action: 'read', reason: 'synthetic' });
  assert.equal(alert.secretValueIncluded, false);
  assert.doesNotMatch(JSON.stringify(alert), /password|token|api[_-]?key|secret-value/i);
});

test('publication gate falha fechado para conteúdo protegido', () => {
  assert.deepEqual(evaluatePublication({ owner: 'synthetic-owner', classification: 'SECRETO' }), { decision: 'BLOCK', reason: 'protected_material' });
  assert.deepEqual(evaluatePublication({ owner: 'synthetic-owner', classification: 'PUBLIC', markers: ['NAO_PUBLICAR'] }), { decision: 'BLOCK', reason: 'protected_material' });
  assert.deepEqual(evaluatePublication({ owner: 'synthetic-owner', classification: 'PUBLIC', markers: [] }), { decision: 'ALLOW', reason: 'publication_gate_pass' });
});

