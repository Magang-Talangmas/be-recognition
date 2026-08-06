import { z } from 'zod';

export const updateSettingsSchema = z.object({
  notifUnregistered: z.boolean().optional(),
  notifCctvOffline: z.boolean().optional(),
  notifMissingCheckIn: z.boolean().optional(),
  trackPauseAuto: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
