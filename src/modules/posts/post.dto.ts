import * as z from 'zod';
import { createPostSchema, updatePostSchema} from './post.validation';

export type CreatePostDto= z.infer<typeof createPostSchema.body>
export type UpdatePostDto= z.infer<typeof updatePostSchema.body>