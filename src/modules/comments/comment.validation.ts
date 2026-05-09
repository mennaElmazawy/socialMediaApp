import * as z from 'zod';
import { generalRules } from '../../common/utils/security/generalRules';

export const createCommentSchema = {
    params: z.strictObject({
        postId: generalRules.id,
    }),
    body: z.strictObject({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        tags: z.array(generalRules.id).optional(),


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
export const replyOnCommentSchema = {
   
    body: createCommentSchema.body


}

export const likeCommentSchema = {
    params: z.strictObject({
        postId: generalRules.id,
        commentId:generalRules.id
    })
}
export const deleteCommentSchema = {
    params: likeCommentSchema.params
}


export const updateCommentSchema = {
    body: z.strictObject({
        content: z.string().optional(),
        attachments: z.array(generalRules.file).optional(),
        removeFiles:z.array(z.string()).optional(),
        tags: z.array(generalRules.id).optional(),
        removeTags: z.array(generalRules.id).optional(),
      
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
    params:likeCommentSchema.params
}

