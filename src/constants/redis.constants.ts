export const REDIS_ATTENDANCE_TTL = 900; // 15 menit dalam detik
export const REDIS_SESSION_TTL = 86400; // 24 jam dalam detik
export const REDIS_PREFIX = {
  ATTENDANCE: 'attendance',
  EMPLOYEE: 'employee',
  SESSION: 'session',
  REFRESH: 'refresh',
} as const;

export type RedisPrefix = (typeof REDIS_PREFIX)[keyof typeof REDIS_PREFIX];

export const buildAttendanceDebounceKey = (
  employeeId: string,
  eventType: string,
): string => `${REDIS_PREFIX.ATTENDANCE}:${employeeId}:${eventType}`;
