/** Validate payloads and query parameters used by the shuttle API. */
export function validateLoginInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['ต้องส่งอีเมลและรหัสผ่าน'];
  }
  const errors = [];
  if (typeof input.email !== 'string' || !input.email.includes('@') || input.email.length > 254) {
    errors.push('รูปแบบอีเมลไม่ถูกต้อง');
  }
  if (typeof input.password !== 'string' || input.password.length === 0 || input.password.length > 200) {
    errors.push('กรุณาระบุรหัสผ่าน');
  }
  return errors;
}

/** Validate optional GET /api/schedules filters. */
export function validateScheduleFilters(query) {
  const errors = [];
  const parsed = {};

  for (const field of ['originId', 'destinationId']) {
    const value = query[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      errors.push(`${field} must be a positive integer`);
    } else {
      parsed[field] = Number(value);
    }
  }

  if (query.date !== undefined) {
    const value = query.date;
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      errors.push('date must be a valid YYYY-MM-DD date');
    } else {
      const [, year, month, day] = match.map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        errors.push('date must be a valid YYYY-MM-DD date');
      } else {
        parsed.date = value;
      }
    }
  }

  if (parsed.originId !== undefined && parsed.originId === parsed.destinationId) {
    errors.push('originId and destinationId must be different');
  }
  return { errors, filters: parsed };
}
