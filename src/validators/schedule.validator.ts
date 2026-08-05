import { z } from 'zod';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

export const createScheduleSchema = z.object({
  scheduleCode: z.string().min(3),
  name: z.string().min(3),
  workDays: z.array(z.string()).min(1),
  checkInTime: z.string().regex(timeRegex, 'Format harus HH:mm'),
  checkOutTime: z.string().regex(timeRegex, 'Format harus HH:mm'),
  breakStartTime: z.string().regex(timeRegex, 'Format harus HH:mm').optional().nullable(),
  breakEndTime: z.string().regex(timeRegex, 'Format harus HH:mm').optional().nullable(),
  toleranceMinutes: z.number().int().min(0).default(0),
});

export const updateScheduleSchema = createScheduleSchema.partial();
