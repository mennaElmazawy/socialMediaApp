import { Request, Response } from "express"
import notificationService from "../../common/services/notification.service"
import { redisService, RedisService } from "../../common/services/redis.service"
import { S3Service } from "../../common/services/s3service"
import { CreateStorytDto } from "./story.dto"
import { randomUUID } from "crypto"
import { Store_Enum } from "../../common/enum/multer.enum"
import { AppError } from "../../common/utils/responses/global_error_handler"
import successResponse from "../../common/utils/responses/response.success"
import StoryRepository from "../../DB/repositories/story.repositories"



class StoryService {

    private readonly _storyModel = new StoryRepository()
    private readonly _s3service = new S3Service()

    private readonly redis: RedisService
    private readonly _notificationService = notificationService
    constructor() {
        this.redis = redisService
    }

    createStory = async (req: Request, res: Response) => {
         const { content, availability }: CreateStorytDto = req.body
      
        let fcmTokens: string[] = []
    
        let urls: string[]=[]
        let folderId = randomUUID()
        if (req?.files) {
            urls = await this._s3service.uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req?.user?._id}/stories/${folderId}`,
                store_type: Store_Enum.memory
            })
        }


        const story = await this._storyModel.create({
            content: content!,
            attachments: urls,
            availability,
            createdBy: req?.user?._id!,
            folderId

        })

        if (!story) {
            await this._s3service.deleteFiles(urls)
            throw new AppError("story not created", 500)
        }

        if (fcmTokens?.length) {
            await this._notificationService.sendNotifications({
                tokens: fcmTokens,
                data: {
                    title: "story created",
                    body: content ? content : "media post"
                }

            })
        }
        successResponse({ res, message: "story created" })
    }
}

export default new StoryService()