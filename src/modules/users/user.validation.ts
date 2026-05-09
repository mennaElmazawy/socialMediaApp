
import * as z from 'zod';

export const verifyForgetPasswordSchema = {
  body:z.object({
    email:z.string().email(),
    otp: z.string().length(6),
    password: z.string().min(6),
    cpassword: z.string().min(6),
  }).refine((data) => {
    return data.password === data.cpassword
  }, {
    error: "Password don't match",
    path: ['cpassword'],

  })

}
export type IVerifyForgetPasswordSchema = z.infer<typeof verifyForgetPasswordSchema.body>


export const updatedPasswordSchema = {
  body: z.object({
    oldPassword: z.string().min(6),
    newPassword:z.string().min(6),
    cpassword: z.string().min(6),
  }).refine((data) => {
    return data.newPassword === data.cpassword
  }, {
    error: "Password don't match",
    path: ['cpassword'],

  })
}

export type IUpdatedPasswordSchema = z.infer<typeof updatedPasswordSchema.body>