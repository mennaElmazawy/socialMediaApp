

import { Router } from "express";
import { authentication } from "../../common/middleware/authentication";
import userServices from "./user.services";
import * as AuthValidation from '../auth/auth.validation';
import * as UserValidation from "./user.validation.js"
import { Validation } from "../../common/middleware/validation";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";


const userRouter = Router()

userRouter.get("/getProfile", authentication, userServices.getProfile)
userRouter.post("/logout", authentication, userServices.logout)
userRouter.get("/refreshToken", userServices.refreshToken)
userRouter.post("/forgetPassword", Validation(AuthValidation.resendEmailSchema), userServices.forgetPassword)
userRouter.patch("/verifyForgetPassword", Validation(UserValidation.verifyForgetPasswordSchema), userServices.verifyForgetPassword)
userRouter.patch("/updatedPassword", authentication, Validation(UserValidation.updatedPasswordSchema), userServices.updatePassword)
userRouter.post("/upload", authentication,
    // multerCloud({store_type:Store_Enum.memory}).array("attachment"),
    userServices.uploadImage)
userRouter.delete("/softDeleteUser", authentication, userServices.softDeleteUser)
userRouter.delete("/hardDeleteUser", authentication, userServices.hardDeleteUser)




export default userRouter