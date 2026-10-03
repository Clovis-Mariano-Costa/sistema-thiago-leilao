'use strict';

const CLASSIFICATIONS = new Set(['PUBLIC', 'SIGILOSO', 'SECRETO']);

function failClosed(reason) {
  return { allowed: false, state: 'BLOCKED', reason };
}

function requestAccess(input = {}) {
  const classification = String(input.classification || '').toUpperCase();
  if (!CLASSIFICATIONS.has(classification)) return failClosed('classification_required');
  if (!input.actorId || !input.purpose || !input.resourceId) return failClosed('actor_purpose_resource_required');
  if (!Number.isFinite(input.expiresAt) || input.expiresAt <= input.requestedAt) return failClosed('valid_expiry_required');
  return {
    allowed: false,
    state: 'REQUESTED',
    actorId: String(input.actorId),
    resourceId: String(input.resourceId),
    classification,
    purpose: String(input.purpose),
    requestedAt: input.requestedAt,
    expiresAt: input.expiresAt,
    requiresReauth: classification !== 'PUBLIC'
  };
}

function approveAccess(request, approval = {}) {
  if (!request || request.state !== 'REQUESTED') return failClosed('request_not_pending');
  if (!approval.approverId || approval.approverId === request.actorId) return failClosed('independent_approver_required');
  if (request.classification !== 'PUBLIC' && approval.reauthenticated !== true) return failClosed('reauth_required');
  return { ...request, state: 'ACTIVE', approvedBy: String(approval.approverId), approvedAt: approval.approvedAt };
}

function authorizeRead(grant, now) {
  if (!grant || grant.state !== 'ACTIVE') return failClosed('grant_not_active');
  if (!Number.isFinite(now) || now >= grant.expiresAt) return failClosed('grant_expired');
  return { allowed: true, state: 'ACTIVE', purpose: grant.purpose, resourceId: grant.resourceId };
}

function safeAlert(event = {}) {
  return {
    eventType: String(event.eventType || 'ACCESS_EVENT'),
    actorId: String(event.actorId || 'unknown'),
    resourceId: String(event.resourceId || 'unknown'),
    classification: CLASSIFICATIONS.has(String(event.classification || '').toUpperCase())
      ? String(event.classification).toUpperCase()
      : 'UNKNOWN',
    action: String(event.action || 'unknown'),
    reason: String(event.reason || ''),
    secretValueIncluded: false
  };
}

module.exports = { requestAccess, approveAccess, authorizeRead, safeAlert };

