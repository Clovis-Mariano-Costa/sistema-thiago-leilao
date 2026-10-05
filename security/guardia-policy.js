'use strict';

const CLASSIFICATIONS = new Set(['PUBLIC', 'SIGILOSO', 'SECRETO']);
const SAFE_REASON_CODE = /^[A-Z0-9_.:-]{1,80}$/;

function failClosed(reason) {
  return { allowed: false, state: 'BLOCKED', reason };
}

function requestAccess(input = {}) {
  const classification = String(input.classification || '').trim().toUpperCase();
  const actorId = String(input.actorId || '').trim();
  const purpose = String(input.purpose || '').trim();
  const resourceId = String(input.resourceId || '').trim();
  const requestedAt = Number(input.requestedAt);
  const expiresAt = Number(input.expiresAt);

  if (!CLASSIFICATIONS.has(classification)) return failClosed('classification_required');
  if (!actorId || !purpose || !resourceId) return failClosed('actor_purpose_resource_required');
  if (!Number.isFinite(requestedAt)) return failClosed('requested_at_required');
  if (!Number.isFinite(expiresAt) || expiresAt <= requestedAt) return failClosed('valid_expiry_required');

  return {
    allowed: false,
    state: 'REQUESTED',
    actorId,
    resourceId,
    classification,
    purpose,
    requestedAt,
    expiresAt,
    requiresReauth: classification !== 'PUBLIC'
  };
}

function approveAccess(request, approval = {}) {
  if (!request || request.state !== 'REQUESTED') return failClosed('request_not_pending');

  const approverId = String(approval.approverId || '').trim();
  const approvedAt = Number(approval.approvedAt);

  if (!approverId || approverId === request.actorId) return failClosed('independent_approver_required');
  if (!Number.isFinite(approvedAt) || approvedAt < request.requestedAt || approvedAt >= request.expiresAt) {
    return failClosed('approval_time_invalid');
  }
  if (request.classification !== 'PUBLIC' && approval.reauthenticated !== true) {
    return failClosed('reauth_required');
  }

  return {
    ...request,
    state: 'ACTIVE',
    approvedBy: approverId,
    approvedAt
  };
}

function authorizeRead(grant, now) {
  const at = Number(now);
  if (!grant || grant.state !== 'ACTIVE') return failClosed('grant_not_active');
  if (!Number.isFinite(at)) return failClosed('authorization_time_required');
  if (at < grant.requestedAt || at >= grant.expiresAt) return failClosed('grant_expired');
  return {
    allowed: true,
    state: 'ACTIVE',
    purpose: grant.purpose,
    resourceId: grant.resourceId,
    expiresAt: grant.expiresAt
  };
}

function safeAlert(event = {}) {
  const classification = String(event.classification || '').trim().toUpperCase();
  const rawReasonCode = String(event.reasonCode || 'UNSPECIFIED').trim().toUpperCase();
  const reasonCode = SAFE_REASON_CODE.test(rawReasonCode) ? rawReasonCode : 'UNSAFE_REASON_REDACTED';

  return {
    eventType: String(event.eventType || 'ACCESS_EVENT'),
    actorId: String(event.actorId || 'unknown'),
    resourceId: String(event.resourceId || 'unknown'),
    classification: CLASSIFICATIONS.has(classification) ? classification : 'UNKNOWN',
    action: String(event.action || 'unknown'),
    reasonCode,
    secretValueIncluded: false
  };
}

module.exports = {
  CLASSIFICATIONS,
  requestAccess,
  approveAccess,
  authorizeRead,
  safeAlert
};
