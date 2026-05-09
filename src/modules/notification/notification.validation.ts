import * as z from 'zod';
import { generalRules } from '../../common/utils/security/generalRules';

export const createNotificationSchema = {
    body: z.strictObject({
        title: z.string().min(1),
        body: z.string().min(1),
        sentTo: z.array(generalRules.id).min(1, "at least one user is required")

    })
}
export const getNotificationSchema = {
    params: z.strictObject({
        notificationId: generalRules.id,
    })
}
export const deleteNotificationSchema = {
    params: getNotificationSchema.params
}
export const updateNotificationSchema = {
    body: z.strictObject({
        title: z.string().min(1).optional(),
        body: z.string().min(1).optional(),
        sentTo: z.array(generalRules.id).min(1, "at least one user is required").optional()

    }),
    params:getNotificationSchema.params
}


