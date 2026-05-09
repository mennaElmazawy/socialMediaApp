import { Request, Response } from "express"
import notificationService from "../../common/services/notification.service"
import { redisService, RedisService } from "../../common/services/redis.service"
import NotificationRepository from "../../DB/repositories/notification.repositories"
import { CreateNotificationDto, UpdateNotificationDto } from "./notification.dto"
import successResponse from "../../common/utils/responses/response.success"
import UserRepository from "../../DB/repositories/user.repositories"
import { Types } from "mongoose"
import { AppError } from "../../common/utils/responses/global_error_handler"




class NotificationService {

    private readonly _notificationModel = new NotificationRepository()
    private readonly _userModel = new UserRepository()


    private readonly redis: RedisService
    private readonly _notificationService = notificationService
    constructor() {
        this.redis = redisService
    }

    createNotification = async (req: Request, res: Response) => {
        const { title, body, sentTo }: CreateNotificationDto = req.body
        const users = await this._userModel.find({
            filter: { _id: { $in: sentTo } }
        })
        const userIds = sentTo.map(
            id => new Types.ObjectId(id)
        )
        const tokens = [...new Set(users.flatMap(user => user.fcmTokens || []))]

        const notification = await this._notificationModel.create({
            title,
            body,
            sentTo: userIds,
            createdBy: req.user._id,
        })

        if (tokens.length) {
            await this._notificationService.sendNotifications({
                tokens,
                data: {
                    title,
                    body,
                }

            })
        }

        successResponse({ res, message: "notification created", data: notification })
    }
    getNotifications = async (req: Request, res: Response) => {
        const notifications = await this._notificationModel.find({
            filter: {
                createdBy: req.user._id
            }
        })
        if (!notifications) {
            throw new AppError("no notifications found", 404)
        }
        successResponse({ res, data: notifications })
    }

    getNotification = async (req: Request, res: Response) => {
        const { notificationId } = req.params
        const notification = await this._notificationModel.findOne({
            filter: {
                _id: notificationId,
                $or: [
                    {
                        sentTo: req.user._id
                    },
                    {
                        createdBy: req.user._id
                    }
                ]
            }
        })

        if (!notification) {
            throw new AppError("not found", 404)
        }

        successResponse({ res, data: notification })
    }

    updateNotification = async (req: Request, res: Response) => {
        const { notificationId } = req.params
        const { title, body, sentTo }: UpdateNotificationDto = req.body

        const notification = await this._notificationModel.findOne({
            filter: {
                _id: notificationId
            }
        })
        if (!notification) {
            throw new AppError("not found", 404)
        }
        if (title) notification.title = title
        if (body) notification.body = body
        if (sentTo) {
            notification.sentTo = sentTo.map(
                id => new Types.ObjectId(id)
            )
        }
        const updated = await notification.save()

        successResponse({
            res,
            data: updated
        })
    }

    deleteNotification = async (req: Request, res: Response) => {
        const { notificationId } = req.params
        const notification = await this._notificationModel.findOne({
            filter: {
                _id: notificationId,
                createdBy:req.user._id
            }
        })
        if (!notification) {
            throw new AppError("not found", 404)
        }
        await this._notificationModel.findOneAndDelete({
            filter:{
                _id:notificationId
            }
        })

        successResponse({
            res,
            message: "notification deleted"
        })
    }


}

export default new NotificationService()