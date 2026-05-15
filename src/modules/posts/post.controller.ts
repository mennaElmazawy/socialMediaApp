import { Router } from "express";
import { authentication } from "../../common/middleware/authentication";
import * as postValidation from "./post.validation"

import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";
import { Validation } from "../../common/middleware/validation";
import postServices from "./post.services";
import commentRouter from "../comments/comment.controller";


const postRouter = Router()
postRouter.use("/:postId/comment{/:commentId/reply}", commentRouter)

postRouter.post("/createPost",
    authentication,
    multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
    Validation(postValidation.createPostSchema),
    postServices.createPost
)


postRouter.get("/getPosts", authentication, postServices.getPosts)
postRouter.patch("/likePost/:postId", authentication, Validation(postValidation.likePostSchema), postServices.likePost)
postRouter.put("/updatePost/:postId",
    authentication,
    multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
    Validation(postValidation.updatePostSchema),
    postServices.updatePost)
postRouter.delete("/softDeletePost/:postId",
    authentication,
    Validation(postValidation.deletePostSchema),
    postServices.softDeletePost
)
postRouter.delete("/hardDeletePost/:postId",
    authentication,
    Validation(postValidation.deletePostSchema),
    postServices.hardDeletePost
)


export default postRouter