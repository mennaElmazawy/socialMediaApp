import { Request, Response } from "express"
import notificationService from "../../common/services/notification.service"
import { redisService, RedisService } from "../../common/services/redis.service"
import TokenServices from "../../common/services/token.services"
import UserRepository from "../../DB/repositories/user.repositories"
import { CreatePostDto, UpdatePostDto } from "./post.dto"
import successResponse from "../../common/utils/responses/response.success"
import { AppError } from "../../common/utils/responses/global_error_handler"
import { Types } from "mongoose"
import { randomUUID } from "node:crypto"
import { S3Service } from "../../common/services/s3service"
import { Store_Enum } from "../../common/enum/multer.enum"
import PostRepository from "../../DB/repositories/post.repositories"
import { AvailabilityPost } from "../../common/utils/security/post.utils"


class PostService {

    private readonly _userModel = new UserRepository()
    private readonly _postModel = new PostRepository()
    private readonly tokenService = new TokenServices()
    private readonly _s3service = new S3Service()

    private readonly redis: RedisService
    private readonly _notificationService = notificationService
    constructor() {
        this.redis = redisService
    }

    createPost = async (req: Request, res: Response) => {
        const { content, tags, allowComment, availability }: CreatePostDto = req.body
        let mentions: Types.ObjectId[] = []
        let fcmTokens: string[] = []
        if (tags?.length) {
            const mentionsTags = await this._userModel.find({
                filter: { _id: { $in: tags } },
            })
            if (tags.length !== mentionsTags.length) {
                throw new AppError("tags are invalid")
            }
            for (const tag of mentionsTags) {
                if (tag._id.toString() === req.user?._id.toString()) {
                    throw new AppError("you can't tag yourself", 400)
                };
                mentions.push(tag._id);
                (await this.redis.getFCMs(tag._id)).map((token) => fcmTokens.push(token))
            }
        }

        let urls: string[] = []
        let folderId = randomUUID()
        if (req?.files) {
            urls = await this._s3service.uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req?.user?._id}/posts/${folderId}`,
                store_type: Store_Enum.memory
            })
        }


        const post = await this._postModel.create({
            content: content!,
            attachments: urls,
            allowComment,
            availability,
            tags: mentions,
            createdBy: req?.user?._id!,
            folderId

        })

        if (!post) {
            await this._s3service.deleteFiles(urls)
            throw new AppError("post not created", 500)
        }

        if (fcmTokens?.length) {
            await this._notificationService.sendNotifications({
                tokens: fcmTokens,
                data: {
                    title: "you are mentioned in a post",
                    body: content ? content : "media post"
                }

            })
        }
        successResponse({ res, message: "post created" })
    }


    getPosts = async (req: Request, res: Response) => {

        const posts = await this._postModel.paginate({
            page: +req.query.page!,
            limit: +req.query.limit!,
            search: {
                ...AvailabilityPost(req),
                ...(req.query.search ? {
                    $or: [
                        { content: { $regex: req.query.search, $options: "i" } }
                    ]
                } : {})
            },
            populate: [{
                path: "comments",
                populate: [{ path: "reply", populate: [{ path: "reply" }] }]
            }]
        })

        successResponse({ res, data: posts })
    }

    likePost = async (req: Request, res: Response) => {
        const { postId } = req.params
        const { flag } = req.query

        let updateQuery: any = {
            $addToSet: { likes: req.user?._id! }
        }

        if (flag && flag === "dislike") {
            updateQuery = {
                $pull: { likes: req.user?._id! }
            }
        }

        const post = await this._postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                ...AvailabilityPost(req)
            },
            update: updateQuery,

        })

        if (!post) {
            throw new AppError("post not found or not authorized", 404)
        }

        successResponse({ res, data: post })
    }

    updatePost = async (req: Request, res: Response) => {
        const { postId } = req.params
        const { content, tags, allowComment, availability, removeFiles, removeTags }: UpdatePostDto = req.body

        const post = await this._postModel.findOne({ filter: { _id: postId, createdBy: req.user?._id! } })
        if (!post) {
            throw new AppError("post not found or not authorized", 404)
        }
        if (removeFiles?.length) {
            const invalidFiles = removeFiles.filter((file: string) => {
                return !post.attachments?.includes(file)
            })
            if (invalidFiles?.length) {
                throw new AppError("some files are invalid", 400)
            }
            await this._s3service.deleteFiles(removeFiles)

            post.attachments = post.attachments?.filter((file: string) => {
                return !removeFiles.includes(file)
            }) as string[]
        }

        const updatedTags = new Set(post?.tags?.map(id => id.toString()) || [])

        removeTags?.forEach((tag: string) => {
            return updatedTags.delete(tag)
        })

        let fcmTokens: string[] = []
        if (tags?.length) {
            const mentionsTags = await this._userModel.find({
                filter: { _id: { $in: tags } },
            })
            if (tags.length !== mentionsTags.length) {
                throw new AppError("tags are invalid")
            }
            for (const tag of mentionsTags) {
                if (tag._id.toString() === req.user?._id.toString()) {
                    throw new AppError("you can't tag yourself", 400)
                };
                updatedTags.add(tag._id.toString());
                (await this.redis.getFCMs(tag._id)).map((token) => fcmTokens.push(token))
            }
        }

        post.tags = [...updatedTags].map((id: string) => new Types.ObjectId(id))



        if (req?.files?.length) {
            let urls = await this._s3service.uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req?.user?._id}/posts/${post.folderId}`,
                store_type: Store_Enum.memory
            })
            post.attachments?.push(...urls)
        }
        if (content) post.content = content
        if (allowComment) post.allowComment = allowComment
        if (availability) post.availability = availability

        if (fcmTokens?.length) {
            await this._notificationService.sendNotifications({
                tokens: fcmTokens,
                data: {
                    title: "you are mentioned in a post",
                    body: content ? content : "media post"
                }

            })
        }



        await post.save()
        successResponse({ res, data: post })
    }

    softDeletePost = async (req: Request, res: Response) => {
        const { postId } = req.params

        const post = await this._postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user._id
            }
        })

        if (!post) {
            throw new AppError("post not found or unauthorized", 404)
        }

        await this._postModel.findByIdAndUpdate({
            id: post._id,
            update: {
                deletedAt: new Date()
            }
        })

        successResponse({
            res,
            message: "post soft deleted"
        })
    }
    hardDeletePost = async (req: Request, res: Response) => {
        const { postId } = req.params

        const post = await this._postModel.findOne({
            filter: {
                _id: postId,
                createdBy: req.user._id
            }
        })

        if (!post) {
            throw new AppError("post not found or unauthorized", 404)
        }

       await this._postModel.findOneAndDelete({
            filter: {
                _id: post._id
            }
        })

        successResponse({
            res,
            message: "post deleted permanently"
        })
    }


}

export default new PostService()