import * as z from 'zod';
import { generalRules } from '../../common/utils/security/generalRules';
import { Allow_comment_Enum, Availability_Enum } from '../../common/enum/post.enum';


export const createPostSchema = {
    body: z.strictObject({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        tags: z.array(generalRules.id).optional(),
        allowComment: z.enum(Allow_comment_Enum).default(Allow_comment_Enum.allow),
        availability: z.enum(Availability_Enum).default(Availability_Enum.friends)

    }).superRefine((args, ctx) => {
        if (!args.content && !args.attachments?.length) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "content is required"
            })
        }
        if (args?.tags) {
            const uniqueTags = new Set(args.tags)
            if (uniqueTags.size !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicate tags"
                })
            }
        }
    })
}


export const likePostSchema = {
    params: z.strictObject({
        postId: generalRules.id
    })
}
export const deletePostSchema = {
    params:likePostSchema.params
}


export const updatePostSchema = {
    body: z.strictObject({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        removeFiles:z.array(z.string()).optional(),
        tags: z.array(generalRules.id).optional(),
        removeTags: z.array(generalRules.id).optional(),
        allowComment: z.enum(Allow_comment_Enum).default(Allow_comment_Enum.allow),
        availability: z.enum(Availability_Enum).default(Availability_Enum.friends)
    }).superRefine((args, ctx) => {
        if (args?.tags) {
            const uniqueTags = new Set(args.tags)
            if (uniqueTags.size !== args.tags.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicate tags"
                })
            }
        }
    }),
    params:likePostSchema.params
}