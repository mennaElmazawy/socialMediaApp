import { Router } from "express";
import * as commentValidation from "./comment.validation"
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";
import { Validation } from "../../common/middleware/validation";
import commentServices from "./comment.services";


const commentRouter = Router({ mergeParams: true })

commentRouter.post("/",
    authentication,
    multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
    Validation(commentValidation.createCommentSchema),
    commentServices.createComment
)
// commentRouter.post("/:commentId/reply",
//     authentication,
//     multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
//     Validation(commentValidation.replyOnCommentSchema),
//     commentServices.replyOnComment
// )

commentRouter.get("/getcomments",
    authentication,
    commentServices.getComments

)

commentRouter.patch("/:commentId/likeComment",
    authentication,
    Validation(commentValidation.likeCommentSchema),
    commentServices.likeComment
)
commentRouter.put("/:commentId/updateComment",
    authentication,
    multerCloud({ store_type: Store_Enum.memory }).array("attachments"),
    Validation(commentValidation.updateCommentSchema),
    commentServices.updateComment
)
commentRouter.delete("/:commentId/softDeleteComment",
    authentication,
    Validation(commentValidation.deleteCommentSchema),
    commentServices.softDeleteComment
)
commentRouter.delete("/:commentId/hardDeleteComment",
    authentication,
    Validation(commentValidation.deleteCommentSchema),
    commentServices.hardDeleteComment
)


export default commentRouter