import { RoleEnum } from './../../common/enum/user.enum';
import { Router } from "express";
import { authentication } from "../../common/middleware/authentication";
import { authorization } from "../../common/middleware/authorization";
import { Validation } from "../../common/middleware/validation";
import * as notificationValidation from "./notification.validation"
import notificationService from "./notification.services"


const notificationRouter = Router()

notificationRouter.post("/createNotification",
    authentication,
    authorization([RoleEnum.admin]),
    Validation(notificationValidation.createNotificationSchema),
    notificationService.createNotification

)
notificationRouter.get("/getNotifications",
    authentication,
    authorization([RoleEnum.admin]),
    notificationService.getNotifications

)
notificationRouter.get("/getNotification/:notificationId",
    authentication,
    Validation(notificationValidation.getNotificationSchema),
    notificationService.getNotification

)
notificationRouter.put("/updateNotification/:notificationId",
    authentication,
    authorization([RoleEnum.admin]),
    Validation(notificationValidation.updateNotificationSchema),
    notificationService.updateNotification

)
notificationRouter.delete("/deleteNotification/:notificationId",
    authentication,
    authorization([RoleEnum.admin]),
    Validation(notificationValidation.deleteNotificationSchema),
    notificationService.deleteNotification

)
export default notificationRouter