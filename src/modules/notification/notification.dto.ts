import * as z from 'zod';
import { createNotificationSchema, updateNotificationSchema } from './notification.validation';

export type CreateNotificationDto = z.infer<typeof createNotificationSchema.body>
export type UpdateNotificationDto = z.infer<typeof updateNotificationSchema.body>