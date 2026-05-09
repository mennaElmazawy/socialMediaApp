import { NextFunction, Request, Response } from "express";
import { RoleEnum } from "../enum/user.enum";
import { AppError } from "../utils/responses/global_error_handler";

export const authorization = (roles:RoleEnum[]) => {
    return (req:Request, res:Response, next:NextFunction) => {
        if (!roles.includes(req.user.role)) {
           throw new AppError ("UnAuthorized",403)
        }
        next();
    };
};