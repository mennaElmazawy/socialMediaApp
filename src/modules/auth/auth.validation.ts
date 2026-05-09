import * as z from 'zod';
import { GenderEnum } from '../../common/enum/user.enum';

export const signUpSchema = {
  body: z.object({
    userName: z.string({ error: "userName is required" }).min(3).max(25),
    email: z.string().email(),
    password: z.string().min(6),
    cpassword: z.string().min(6),
    age: z.number().min(18).max(60).optional(),
    gender: z.enum(GenderEnum).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  }).refine((data) => {
    return data.password === data.cpassword
  }, {
    error: "Password don't match",
    path: ['cpassword'],

  })

}

export type ISignUpType = z.infer<typeof signUpSchema.body>

export const confirmEmailSchema = {
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6)
  })
}

export type IConfirmEmailType = z.infer<typeof confirmEmailSchema.body>

export const resendEmailSchema = {
  body: z.object({
    email: z.string().email()
  })
}

export type IResendEmailType = z.infer<typeof resendEmailSchema.body>


export const signInSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fcm:z.string().optional()
  })
}

export type ISignInType = z.infer<typeof signInSchema.body>

