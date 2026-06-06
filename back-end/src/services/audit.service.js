const AuditLog = require('../models/AuditLog');

const actorFromRequest = (req) => ({
  id: req.user?._id,
  name: req.user?.name,
  email: req.user?.email,
  role: req.user?.role,
});

const recordAuditLog = async (req, payload = {}) => {
  try {
    await AuditLog.create({
      action: payload.action,
      status: payload.status || 'success',
      actor: payload.actor || actorFromRequest(req),
      entity: payload.entity,
      instructor: payload.instructor,
      subject: payload.subject,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      metadata: payload.metadata,
    });
  } catch {
    // Audit logging should never break the main workflow.
  }
};

module.exports = { recordAuditLog };
