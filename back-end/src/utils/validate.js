/**
 * Lightweight schema validation utilities.
 * Validates request bodies without adding external dependencies.
 */

/**
 * Returns an error message string if validation fails, or null if valid.
 * @param {object} body
 * @param {Array<{ field: string, type?: string, required?: boolean, enum?: string[], min?: number, max?: number, isBoolean?: boolean }>} rules
 */
const validateBody = (body, rules) => {
  for (const rule of rules) {
    const value = body[rule.field];
    const isEmpty = value === undefined || value === null || (typeof value === 'string' && !value.trim());

    if (rule.required && isEmpty) {
      return `${rule.field} is required`;
    }
    if (isEmpty) continue;

    if (rule.isBoolean && typeof value !== 'boolean') {
      return `${rule.field} must be true or false`;
    }
    if (rule.type === 'string' && typeof value !== 'string') {
      return `${rule.field} must be a string`;
    }
    if (rule.type === 'number') {
      const num = Number(value);
      if (!Number.isFinite(num)) return `${rule.field} must be a number`;
      if (rule.min !== undefined && num < rule.min) return `${rule.field} must be at least ${rule.min}`;
      if (rule.max !== undefined && num > rule.max) return `${rule.field} must be at most ${rule.max}`;
    }
    if (rule.enum && !rule.enum.includes(value)) {
      return `${rule.field} must be one of: ${rule.enum.join(', ')}`;
    }
    if (rule.type === 'array' && !Array.isArray(value)) {
      return `${rule.field} must be an array`;
    }
    if (rule.type === 'mongoId' && !/^[a-f\d]{24}$/i.test(String(value))) {
      return `${rule.field} must be a valid ID`;
    }
  }
  return null;
};

// Reusable schema fragments
const groupSchema = [
  { field: 'name', type: 'string', required: true },
  { field: 'section', type: 'mongoId', required: true },
];

const sectionSchema = [
  { field: 'name', type: 'string', required: true },
  { field: 'block', type: 'string', required: true },
];

const registrationLinkSchema = [
  { field: 'label', type: 'string', required: true },
];

const settingsAnnouncementSchema = [
  { field: 'isActive', isBoolean: true },
  { field: 'title', type: 'string' },
  { field: 'message', type: 'string' },
];

const userCreateSchema = [
  { field: 'name', type: 'string', required: true },
  { field: 'email', type: 'string', required: true },
  { field: 'password', type: 'string', required: true },
  { field: 'role', type: 'string', required: true, enum: ['superadmin', 'admin', 'panel'] },
];

const subjectLimitSchema = [
  { field: 'subjectLimit', type: 'number', required: true, min: 1 },
];

const gradingLockSchema = [
  { field: 'gradingLocked', isBoolean: true, required: true },
  { field: 'subject', type: 'mongoId', required: true },
];

module.exports = {
  validateBody,
  groupSchema,
  sectionSchema,
  registrationLinkSchema,
  settingsAnnouncementSchema,
  userCreateSchema,
  subjectLimitSchema,
  gradingLockSchema,
};
