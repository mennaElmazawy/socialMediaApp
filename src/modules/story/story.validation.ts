
import * as z from 'zod';
import { generalRules } from '../../common/utils/security/generalRules';
import { Availability_Enum } from '../../common/enum/post.enum';

export const createstorySchema = {
    body: z.strictObject({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        availability: z.enum(Availability_Enum).default(Availability_Enum.friends)

    }).superRefine((args, ctx) => {
        if (!args.content && !args.attachments?.length) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "content is required"
            })
        }
       
    })
}
