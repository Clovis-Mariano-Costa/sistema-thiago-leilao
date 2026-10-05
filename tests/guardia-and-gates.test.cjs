const test = require('node:test');
const assert = require('node:assert/strict');
const { requestAccess, approveAccess, authorizeRead, safeAlert } = require('../security/guardia-policy');
const { evaluatePublication } = require('../security/publication-gates');

test('Guardia exige propósito, aprovação independente, reauth e expiração', () => {
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
  assert.equal(approveAccess(request, { approverId: 'reviewer', reauthenticated: false, approvedAt: 110 }).reason, 'reauth_required');
  const active = approveAccess(request, { approverId: 'reviewer', reauthenticated: true, approvedAt: 110 });
  assert.equal(active.state, 'ACTIVE');
  assert.equal(authorizeRead(active, 150).allowed, true);
  assert.equal(authorizeRead(active, 200).allowed, false);
});

test('Guardia falha fechado para tempos inválidos', () => {
  assert.equal(requestAccess({
    actorId: 'u', resourceId: 'r', classification: 'PUBLIC', purpose: 'p',
    requestedAt: NaN, expiresAt: 200
  }).reason, 'requested_at_required');

  const request = requestAccess({
    actorId: 'u', resourceId: 'r', classification: 'PUBLIC', purpose: 'p',
    requestedAt: 100, expiresAt: 200
  });
  assert.equal(approveAccess(request, { approverId: 'reviewer', approvedAt: 200 }).reason, 'approval_time_invalid');
});

test('alerta Guardia não transporta texto livre potencialmente secreto', () => {
  const alert = safeAlert({
    eventType: 'SECRET_READ_ATTEMPT',
    actorId: 'synthetic-user',
    resourceId: 'synthetic-secret',
    classification: 'SECRETO',
    action: 'read',
    reason: 'Bearer should-not-leak',
    reasonCode: 'ACCESS.DENIED'
  });
  assert.equal(alert.secretValueIncluded, false);
  assert.equal(alert.reasonCode, 'ACCESS.DENIED');
  assert.equal(Object.hasOwn(alert, 'reason'), false);
  assert.doesNotMatch(JSON.stringify(alert), /should-not-leak/i);
});

test('publication gate bloqueia classificação desconhecida e material protegido', () => {
  assert.deepEqual(evaluatePublication({ owner: 'owner', classification: 'INTERNAL' }), { decision: 'BLOCK', reason: 'classification_unknown' });
  assert.deepEqual(evaluatePublication({ owner: 'owner', classification: 'SECRETO' }), { decision: 'BLOCK', reason: 'protected_material' });
  assert.deepEqual(evaluatePublication({ owner: 'owner', classification: 'PUBLIC', markers: ['NAO_PUBLICAR'] }), { decision: 'BLOCK', reason: 'protected_marker' });
  assert.deepEqual(evaluatePublication({ owner: 'owner', classification: 'PUBLIC', secretDetected: true }), { decision: 'BLOCK', reason: 'secret_detected' });
});

test('publication gate libera somente PUBLIC com owner e sem marcador protegido', () => {
  assert.deepEqual(
    evaluatePublication({ owner: 'owner', classification: 'PUBLIC', markers: ['release-approved'] }),
    { decision: 'ALLOW', reason: 'publication_gate_pass' }
  );
});
