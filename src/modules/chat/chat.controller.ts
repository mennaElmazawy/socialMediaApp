import { Router } from "express";
import chatService from "./chat.service";
import { authentication } from "../../common/middleware/authentication";


const chatRouter = Router({ mergeParams: true })
chatRouter.get("/",authentication, chatService.getChats)

export default chatRouter