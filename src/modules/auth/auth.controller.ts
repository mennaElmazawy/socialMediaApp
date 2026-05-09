
import { Router } from "express";
import authServices from "./auth.services";
import { Validation } from "../../common/middleware/validation";
import * as AuthValidation from "./auth.validation";


const authRouter = Router();

authRouter.post("/signup",Validation(AuthValidation.signUpSchema),authServices.signUp);
authRouter.post("/signup/gmail", authServices.signUpWithGmail)
authRouter.patch("/confirmEmail", Validation(AuthValidation.confirmEmailSchema), authServices.confirmEmail)
authRouter.post("/resendOTP", Validation(AuthValidation.resendEmailSchema), authServices.resendOTP)
authRouter.post("/signIn",Validation(AuthValidation.signInSchema),authServices.signIn);


export default authRouter