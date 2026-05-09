import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/responses/global_error_handler';



type reqType = keyof Request
type SchemaType = Partial<Record<reqType, ZodType>>

export const Validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationErrors = []
        for (const key of Object.keys(schema) as reqType[]) {
            if (!schema[key]) continue;
            if(req?.file){
                req.body.attachment = req.file
            }
            if(req?.files){
                req.body.attachments = req.files
            }
            const result = schema[key].safeParse(req[key])
            if (!result.success) {
                validationErrors.push(result.error.message)
            }
        }
        if (validationErrors.length > 0) {
            throw new AppError(JSON.parse(validationErrors as unknown as string), 400)
        }

        next()



    }
}