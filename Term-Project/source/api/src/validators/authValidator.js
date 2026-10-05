export function validateLoginInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['email_password_required'];
  }
  const errors = [];
  if (typeof input.email !== 'string' || !input.email.includes('@') || input.email.length > 254) errors.push('email_invalid');
  if (typeof input.password !== 'string' || input.password.length === 0 || input.password.length > 200) errors.push('password_required');
  return errors;
}
