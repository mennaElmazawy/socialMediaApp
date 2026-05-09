import { createstorySchema } from "./story.validation";
import * as z from 'zod';


export type CreateStorytDto= z.infer<typeof createstorySchema.body>
