
import { AppError } from '../../common/utils/responses/global_error_handler';
import { NextFunction, Request, Response } from "express";
import { IConfirmEmailType, IResendEmailType, ISignInType, ISignUpType } from "./auth.validation";
import { IUser } from "../../DB/models/user.model";
import { HydratedDocument } from "mongoose";
import UserRepository from "../../DB/repositories/user.repositories";
import { encrypt } from "../../common/utils/security/encrypt.security";
import { Compare, Hash } from "../../common/utils/security/hash.security";
import { generateOTP, sendEmail } from "../../common/utils/email/sendEmail.service";
import { emailTemplate } from "../../common/utils/email/email.template";
import { RedisService, redisService } from "../../common/services/redis.service";
import { emailEnum } from "../../common/enum/email.enum";
import { eventEmitter } from "../../common/utils/email/email.events";
import { ProviderEnum } from "../../common/enum/user.enum";
import { randomUUID } from 'node:crypto';
import  TokenServices  from '../../common/services/token.services';
import { CLIENT_ID, REFRESH_SECRET_KEY, SECRET_KEY } from '../../config/config.service';
import { OAuth2Client } from 'google-auth-library';
import successResponse from '../../common/utils/responses/response.success';
import notificationService from '../../common/services/notification.service';




class authServices {

    private readonly _userModel = new UserRepository()
    private readonly tokenService = new TokenServices()
    private readonly redis: RedisService
    private readonly _notificationService =  notificationService
    constructor() {
        this.redis = redisService
    }
    sendEmailOtp = async ({ email, subject }: { email: string, subject: emailEnum }) => {

        const isblocked = await this.redis.ttl(this.redis.block_otp_key({ email, subject }))
        if (isblocked > 0) {
            throw new AppError(`You are blocked from requesting OTP. Please try again after ${isblocked} seconds.`);
        }
        const otpTTL = await this.redis.ttl(this.redis.otp_key({ email, subject }))
        if (otpTTL > 0) {
            throw new AppError(`Please wait ${otpTTL} seconds before requesting a new OTP`);
        }

        const maxTries = await this.redis.get(this.redis.max_otp_key({ email, subject }))
        if (maxTries > 3) {
            await this.redis.setValue({ key: this.redis.block_otp_key({ email, subject }), value: "1", ttl: 60 })
            await this.redis.del(this.redis.max_otp_key({ email, subject }))
            throw new AppError("Maximum OTP resend attempts reached. Please try again later.");
        }

        const otp = await generateOTP();
        eventEmitter.emit(subject, async () => {
            await sendEmail({
                to: email,
                subject: subject,
                html: emailTemplate(otp)
            });
            await this.redis.setValue({ key: this.redis.otp_key({ email, subject }), value: Hash({ plainText: `${otp}` }), ttl: 60 })
            await this.redis.incr(this.redis.max_otp_key({ email, subject }))

        })



    };

    resendOTP = async (req: Request, res: Response) => {

        const { email }: IResendEmailType = req.body;

        const user = await this._userModel.findOne({

            filter: { email, confirmed: { $exists: false }, provider: ProviderEnum.local },
        })
        if (!user) {
            throw new AppError("User not found");
        }
        await this.sendEmailOtp({ email, subject: emailEnum.confirmEmail });
        successResponse({ res, message: "OTP resent successfully" })


    };



    confirmEmail = async (req: Request, res: Response) => {
        const { email, otp }: IConfirmEmailType = req.body;
        const otpValue = await this.redis.get(this.redis.otp_key({ email, subject: emailEnum.confirmEmail }))
        if (!otpValue) {
            throw new AppError("OTP expired ");
        }
        const user = await this._userModel.findOne({
            filter: { email, confirmed: { $exists: false }, provider: ProviderEnum.local },})
        if (!user) {
            throw new AppError("User not found");
        }
        if (!Compare({ plainText: otp, cipherText: otpValue })) {
            throw new AppError("Invalid OTP");
        }
        user.isConfirmed = new Date();
        await user.save();
        await this.redis.del(this.redis.otp_key({ email, subject: emailEnum.confirmEmail }))
        await this.redis.del(this.redis.max_otp_key({ email, subject: emailEnum.confirmEmail }));
        successResponse({ res, message: "email confirmed successfully" })
    };

    signUp = async (req: Request, res: Response, next: NextFunction) => {
        let { userName, email, password, age, gender, address, phone }: ISignUpType = req.body
        const isEmailExist = await this._userModel.findOne({ filter: { email }, })
        if (isEmailExist) {
            throw new AppError("Email already exists", 409)
        }
        const user: HydratedDocument<IUser> = await this._userModel.create({
            userName,
            email,
            password: Hash({ plainText: password }),
            age,
            gender,
            address,
            phone: phone ? encrypt(phone) : null
        } as Partial<IUser>)

        await this.sendEmailOtp({ email, subject: emailEnum.confirmEmail })
        successResponse({ res, status: 201, message: "OTP sent to your email please confirm it" })
        

    }


    signIn = async (req: Request, res: Response, next: NextFunction) => {

        const { email, password, fcm }: ISignInType = req.body;
        const user = await this._userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.local,
                isConfirmed: { $exists: true }
            }
        })
        if (!user) {
            throw new AppError("user not exist", 404)
        }
        const attemptsKey = this.redis.max_password_key({ email });
        const banKey = this.redis.block_password_key({ email });
        const isBlocked = await this.redis.get(banKey);
        if (isBlocked) {
            throw new AppError("Account is blocked. Please try again later.", 400)
        }

        if (!Compare({ plainText: password, cipherText: user.password })) {
            const attempts = await this.redis.incr(attemptsKey);
            if (attempts >= 5) {
                await this.redis.setValue({ key: banKey, value: "1", ttl: 300 })
                const ttlValue = await this.redis.ttl(this.redis.block_password_key({ email }));
                await this.redis.del(attemptsKey)
                throw new AppError(`Maximum password attempts reached.Try again after ${ttlValue}s`, 400)
            }
            throw new AppError("invalid password", 400)
        }
        await this.redis.del(attemptsKey)
        if (!user.isConfirmed) {
            throw new AppError("Please confirm your email first", 400)
            
        }

        const jwtid = randomUUID();
        const access_token = await this.tokenService.GenerateToken({
            payload: { id: user._id, email: user.email, role: user.role },
            secret: SECRET_KEY!,
            options: {
                expiresIn: "1h",
                jwtid
            }
        })
        const refresh_token = await this.tokenService.GenerateToken({
            payload: { id: user._id, email: user.email, role: user.role },
            secret: REFRESH_SECRET_KEY!,
            options: {
                expiresIn: "1y",
                jwtid
            }
        })


        if(fcm){
            await this.redis.addFCM({userId:user._id,FCMToken:fcm })
            const tokens =await this.redis.getFCMs(user._id)
            await this._notificationService.sendNotifications({
                tokens,
                data: {
                    title: `hi ${user.userName}`,
                    body:`new login at ${new Date()}`
                }
            })
        }
        successResponse({ res, message: "login success", data: { access_token, refresh_token } })
    }

    signUpWithGmail = async (req: Request, res: Response, next: NextFunction) => {
        const { idToken } = req.body;
        console.log(CLIENT_ID)
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: CLIENT_ID!
        });

        const payload = ticket.getPayload();
        let user = await this._userModel.findOne({
            filter: {
                email: payload?.email as string, }
        })
        if (!user) {
            user = await this._userModel.create({
                email: payload!.email as string,
                isConfirmed: new Date(),
                userName: payload!.name as string,
                provider: ProviderEnum.google

            } as Partial<IUser>)
        }
        if (user.provider == ProviderEnum.local) {
            throw new AppError("please login on system only", 400)
        }
        const access_token = await this.tokenService.GenerateToken({
            payload: { id: user._id, email: user.email, role: user.role },
            secret: SECRET_KEY!,
            options: {
                expiresIn: "1h",

            }
        })
       successResponse({ res, message: "login success", data: { access_token } })
    }
}

export default new authServices()