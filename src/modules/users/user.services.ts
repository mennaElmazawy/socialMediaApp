import { NextFunction, Request, Response } from "express";
import TokenServices from "../../common/services/token.services";
import { redisService, RedisService } from "../../common/services/redis.service";
import { PREFIX, REFRESH_SECRET_KEY, SALT_ROUNDS, SECRET_KEY } from "../../config/config.service";
import { IDecodedToken } from "../../common/middleware/authentication";
import { AppError } from "../../common/utils/responses/global_error_handler";
import UserRepository from "../../DB/repositories/user.repositories";
import { ProviderEnum } from "../../common/enum/user.enum";
import { emailEnum } from "../../common/enum/email.enum";
import authServices from "./../auth/auth.services"
import { IResendEmailType } from "../auth/auth.validation";
import { Compare, Hash } from "../../common/utils/security/hash.security";
import successResponse from "../../common/utils/responses/response.success";
import { IUpdatedPasswordSchema, IVerifyForgetPasswordSchema } from "./user.validation";
import { S3Service } from "../../common/services/s3service";



class UserServices {
    private readonly _userModel = new UserRepository()
    private readonly tokenService = new TokenServices()
    private readonly _s3service = new S3Service()

    private readonly redis: RedisService
    constructor() {
        this.redis = redisService
    }

    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user
        successResponse({ res, message: "done", data: user })
    }

    logout = async (req: Request, res: Response, next: NextFunction) => {
        const { flag } = req.query
        const { fcm } = req.body

        if (flag === "all") {
            req.user.changeCredential = new Date()
            await req.user.save()
            await this.redis.del(await this.redis.keys(this.redis.get_key({ userId: req.user._id })))
        } else {
            await this.redis.setValue({
                key: this.redis.revoked_key({ userId: req.user._id, jti: req.decoded.jti! }),
                value: `${req.decoded.jti}`,
                ttl: req.decoded.exp! - Math.floor(Date.now() / 1000)
            })

        }
        // await this.redis.removeFCM({ userId: req.user._id, FCMToken: fcm })
        successResponse({ res, message: "logout success" })
    }

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        const { authorization } = req.headers;
        if (!authorization) {
            throw new AppError("token not exist", 400)
        }
        const [prefix, token] = authorization.split(" ");
        if (prefix !== PREFIX) {
            throw new AppError("invalid prefix", 401)
        }
        const decoded = await this.tokenService.VerifyToken({
            token: token!,
            secret: REFRESH_SECRET_KEY!
        }) as IDecodedToken;
        if (!decoded || !decoded?.id) {
            throw new AppError("invalid token", 401)
        }
        const user = await this._userModel.findOne({ filter: { _id: decoded.id }, projection: "-password" })
        if (!user) {
            throw new AppError("user not exist", 404)
        }
        const revokeToken = await this.redis.get(this.redis.revoked_key({ userId: decoded.id, jti: decoded.jti! }));
        if (revokeToken) {
            throw new AppError("invalid token Revoked", 401)
        }
        const access_token = this.tokenService.GenerateToken({
            payload: { id: user._id, email: user.email },
            secret: SECRET_KEY!,
            options: {
                expiresIn: 60 * 5,
            }
        })
        successResponse({ res, message: "success", data: { access_token } })
    }

    forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
        const { email }: IResendEmailType = req.body;
        const user = await this._userModel.findOne({

            filter: { email, confirmed: { $exists: true }, provider: ProviderEnum.local }
        })
        if (!user) {
            throw new AppError("User not found", 404);
        }
        await authServices.sendEmailOtp({ email, subject: emailEnum.forgetPassword });
        successResponse({ res, message: "OTP sent successfully" })

    }

    verifyForgetPassword = async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp, password }: IVerifyForgetPasswordSchema = req.body;

        const otpValue = await this.redis.get(this.redis.otp_key({ email, subject: emailEnum.forgetPassword }))
        if (!otpValue) {
            throw new AppError("OTP expired ");
        }

        if (!Compare({ plainText: otp, cipherText: otpValue })) {
            throw new Error("Invalid OTP");
        }
        const user = await this._userModel.findOneAndUpdate({
            filter: { email, confirmed: { $exists: true }, provider: ProviderEnum.local },
            update: {
                password: Hash({ plainText: password, salt_Rounds: SALT_ROUNDS }),
                changeCredential: new Date()
            }
        })
        if (!user) {
            throw new Error("User not found ", { cause: 404 })
        }
        await this.redis.del(this.redis.get_key({ userId: user!._id }))
        await this.redis.del(this.redis.otp_key({ email, subject: emailEnum.forgetPassword }))

        successResponse({ res, message: "password reset successfully" })


    }

    updatePassword = async (req: Request, res: Response, next: NextFunction) => {
        let { oldPassword, newPassword }: IUpdatedPasswordSchema = req.body;
        const user = await this._userModel.findOne({ filter: { _id: req.user._id }, projection: "+password" })

        if (!Compare({ plainText: oldPassword, cipherText: user!.password })) {
            throw new Error("invalid old password", { cause: 400 })
        }
        const hash = Hash({ plainText: newPassword, salt_Rounds: SALT_ROUNDS })
        req.user.password = hash;
        req.user.changeCredential = new Date()
        await req.user.save();

        successResponse({ res, message: "password updated successfully" })
    }


    uploadImage = async (req: Request, res: Response, next: NextFunction) => {

        // const urls = await this._s3service.uploadFiles({
        //     files: req.files as Express.Multer.File[],
        //     path: `users/manyFiles/${req.user._id}`,
        //     isLarge: true
        // })

        const { fileName, ContentType } = req.body
        const { url, Key } = await this._s3service.createPreSignedUrl({
            fileName,
            ContentType,
            path: `users/${req?.user?._id}`
        })

        //  await this._userModel.findOneAndUpdate({
        //     filter:{_id:req?.user?._id},
        //     update:{profilePic:Key}
        //  })
        successResponse({ res, data: { url, Key } })
    }
    softDeleteUser = async (req: Request, res: Response) => {
        const userId = req.user._id
        const user = await this._userModel.findByIdAndUpdate({
            id: userId,
            update: {
                deletedAt: new Date()
            }
        })

        if (!user) {
            throw new AppError("user not found", 404)
        }

        successResponse({ res, message: "user soft deleted", data: user })
    }
    hardDeleteUser = async (req: Request, res: Response) => {
        const userId = req.user._id
        const user = await this._userModel.findOneAndDelete({
            filter: {
                _id: userId
            }
        })

        if (!user) {
            throw new AppError("user not found", 404)
        }

        successResponse({ res, message: "user deleted permenently", data: user })
    }


}

export default new UserServices()