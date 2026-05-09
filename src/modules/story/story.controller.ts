import { Router } from "express";
import { authentication } from "../../common/middleware/authentication";
import multerCloud from "../../common/middleware/multer.cloud";
import { Store_Enum } from "../../common/enum/multer.enum";
import { Validation } from "../../common/middleware/validation";
import * as storyValidation from "./story.validation"
import storyServices from "./story.services"


const storyRouter = Router()


storyRouter.post("/createStory",
    authentication,
    multerCloud({ store_type: Store_Enum.memory }).array("attachments",1),
    Validation(storyValidation.createstorySchema),
    storyServices.createStory
)

export default storyRouter