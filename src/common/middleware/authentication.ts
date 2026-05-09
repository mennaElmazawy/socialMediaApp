import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/responses/global_error_handler";
import { PREFIX, SECRET_KEY } from "../../config/config.service";
import TokenServices from "../services/token.services";
import UserRepository from "../../DB/repositories/user.repositories";
import { redisService } from "../services/redis.service";
import { HydratedDocument } from "mongoose";
import { IUser } from "../../DB/models/user.model";
import { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
    interface Request {
        user: HydratedDocument<IUser>,
        decoded: JwtPayload
    }
}

export interface IDecodedToken extends JwtPayload {
    id: string;
    jti: string;
}

export const authentication = async (req: Request, res: Response, next: NextFunction) => {
    const _userModel = new UserRepository()
    const tokenService = new TokenServices()
    const { authorization } = req.headers;
    if (!authorization) {
        throw new AppError("token not exist", 401)
    }

    const [prefix, token] = authorization.split(" ");
    if (prefix !== PREFIX) {
        throw new AppError("invalid prefix", 401)
    }

    const decoded = await tokenService.VerifyToken({
        token: token!,
        secret: SECRET_KEY!
    }) as IDecodedToken;
    if (!decoded || !decoded?.id) {
        throw new AppError("invalid token", 401)
    }
    const user = await _userModel.findOne({ filter: { _id: decoded.id }, projection: "-password" })
    if (!user) {
        throw new AppError("user not exist", 404)
    }
    if (user.changeCredential && user.changeCredential.getTime() > decoded.iat! * 1000) {
        throw new AppError("invalid token", 401)
    }

    const revokeToken = await redisService.get(redisService.revoked_key({ userId: decoded.id, jti: decoded.jti! }));
    if (revokeToken) {
        throw new AppError("invalid token Revoked", 401)
    }

    req.user = user;
    req.decoded = decoded;
    next()
}