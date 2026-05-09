import * as z from 'zod';
import { createCommentSchema, updateCommentSchema } from './comment.validation';

export type CreateCommentBodyDto= z.infer<typeof createCommentSchema.body>
export type UpdateCommentBodyDto=z.infer<typeof updateCommentSchema.body>
