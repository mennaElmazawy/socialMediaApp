import { Router } from "express";
import chatService from "./chat.service";
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud.js";
import { Multer_Enum } from "../../common/enum/multer.enum.js";


const chatRouter = Router({ mergeParams: true })
chatRouter.get("/",authentication, chatService.getChats)
chatRouter.get("/group/:groupId",authentication, chatService.getGroupChats)
chatRouter.post("/createGroupChat",
    authentication,
    multerCloud({custom_Types:Multer_Enum.image}).single("attachment"),
     chatService.createGroupChat)

export default chatRouter