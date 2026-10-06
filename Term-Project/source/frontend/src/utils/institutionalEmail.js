export function isInstitutionalEmail(value) {
  return /^[^@\s]+@live\.rmutl\.ac\.th$/i.test(String(value ?? '').trim());
}
