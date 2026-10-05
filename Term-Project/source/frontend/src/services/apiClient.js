/**
 * ตัวกลางสำหรับคุยกับ API — ที่เดียวที่เรียก fetch()
 * Shuttle API calls go through this module.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';
let authToken = '';

export function setApiAuthToken(token) {
  authToken = token ?? '';
}

/** error ที่รู้ว่ามาจาก API พร้อม status ที่ได้กลับมา */
export class ApiError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseError(response) {
  try {
    const body = await response.json();
    return { message: body.error ?? `คำขอไม่สำเร็จ (${response.status})`, code: body.code ?? null };
  } catch {
    return { message: `คำขอไม่สำเร็จ (${response.status})`, code: null };
  }
}

/**
 * เรียก API แล้วคืนข้อมูลที่ parse แล้ว
 * - ตอบ 2xx → คืนข้อมูล (204 คืน null เพราะไม่มี body)
 * - ตอบ 4xx/5xx → โยน ApiError พร้อม status
 * - ต่อ API ไม่ได้เลย → โยน ApiError status 0
 */
export async function apiFetch(path, options = {}) {
  let response;
  const { headers: optionHeaders = {}, ...fetchOptions } = options;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...optionHeaders,
      },
    });
  } catch {
    // fetch โยน error เมื่อต่อเซิร์ฟเวอร์ไม่ได้เลย เช่น API ไม่ได้เปิด
    throw new ApiError('API connection failed', 0, 'network_error');
  }

  if (!response.ok) {
    const error = await parseError(response);
    throw new ApiError(error.message, response.status, error.code);
  }

  if (response.status === 204) return null;
  return response.json();
}
