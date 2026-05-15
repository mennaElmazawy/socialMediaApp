import { Allow_comment_Enum, On_Model_Enum } from './../../common/enum/post.enum';
import { Request, Response } from "express"
import notificationService from "../../common/services/notification.service"
import { redisService, RedisService } from "../../common/services/redis.service"
import UserRepository from "../../DB/repositories/user.repositories"
import successResponse from "../../common/utils/responses/response.success"
import { AppError } from "../../common/utils/responses/global_error_handler"
import { HydratedDocument, Types } from "mongoose"
import { S3Service } from "../../common/services/s3service"
import { Store_Enum } from "../../common/enum/multer.enum"
import PostRepository from "../../DB/repositories/post.repositories"
import { AvailabilityPost } from "../../common/utils/security/post.utils"
import CommentRepository from "../../DB/repositories/comment.repositories"
import { CreateCommentBodyDto, UpdateCommentBodyDto } from "./comment.dto"
import { IPost } from "../../DB/models/post.model"
import { randomUUID } from 'crypto';
import { IComment } from '../../DB/models/comment.model.js';


class CommentService {

    private readonly _userModel = new UserRepository()
    private readonly _postModel = new PostRepository()
    private readonly _commentModel = new CommentRepository()
    private readonly _s3service = new S3Service()

    private readonly redis: RedisService
    private readonly _notificationService = notificationService
    constructor() {
        this.redis = redisService
    }

    createComment = async (req: Request, res: Response) => {
        const { postId, commentId } = req.params
        const { content, tags, onModel }: CreateCommentBodyDto = req.body
        let doc: HydratedDocument<IPost | IComment> | null = null
        if (onModel === On_Model_Enum.Post && !commentId) {
            doc = await this._postModel.findOne({
                filter: {
                    _id: postId,
                    $or: [...AvailabilityPost(req)],
                    allowComment: Allow_comment_Enum.allow
                }
            })

            if (!doc) {
                throw new AppError("post not found", 404)
            }
        } else if (onModel === On_Model_Enum.Comment && commentId) {
            const comment = await this._commentModel.findOne({
                filter: {
                    _id: commentId!,
                    refId: postId!
                },
                options: {
                    populate: [{
                        path: "refId",
                        match: {
                            $or: [...AvailabilityPost(req)],
                            allowComment: Allow_comment_Enum.allow


                        }

                    }]
                }
            })

            if (!comment?.refId) {
                throw new AppError("comment not found", 404)
            }
            doc = comment
        }

        if (!doc) {
            throw new AppError("invalid onModel value", 400)
        }



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
                path: `users/${req?.user?._id}/posts/${doc?.folderId}/comments/${folderId}`,
                store_type: Store_Enum.memory
            })
        }

        const comment = await this._commentModel.create({
            content: content || "",
            attachments: urls,
            refId: doc?._id!,
            tags: mentions,
            createdBy: req?.user?._id!,
            folderId,
            onModel: onModel

        })

        if (!comment) {
            await this._s3service.deleteFiles(urls)
            throw new AppError("post not created", 500)
        }



        if (fcmTokens?.length) {
            await this._notificationService.sendNotifications({
                tokens: fcmTokens,
                data: {
                    title: "you are mentioned in a comment",
                    body: content ? content : "media comment"
                }

            })
        }
        successResponse({ res, message: "comment created", data: comment })
    }

    // replyOnComment = async (req: Request, res: Response) => {
    //     const { postId, commentId } = req.params
    //     const { content, tags }: CreateCommentBodyDto = req.body

    //     const comment = await this._commentModel.findOne({
    //         filter: {
    //             _id: commentId!,
    //             postId: postId!
    //         },
    //         options: {
    //             populate: [{
    //                 path: "postId",
    //                 match: {
    //                     $or: [...AvailabilityPost(req)],
    //                     allowComment: Allow_comment_Enum.allow


    //                 }

    //             }]
    //         }
    //     })

    //     if (!comment?.postId) {
    //         throw new AppError("comment not found", 404)
    //     }

    //     let mentions: Types.ObjectId[] = []
    //     let fcmTokens: string[] = []
    //     if (tags?.length) {
    //         const mentionsTags = await this._userModel.find({
    //             filter: { _id: { $in: tags } },
    //         })
    //         if (tags.length !== mentionsTags.length) {
    //             throw new AppError("tags are invalid")
    //         }
    //         for (const tag of mentionsTags) {
    //             if (tag._id.toString() === req.user?._id.toString()) {
    //                 throw new AppError("you can't tag yourself", 400)
    //             };
    //             mentions.push(tag._id);
    //             (await this.redis.getFCMs(tag._id)).map((token) => fcmTokens.push(token))
    //         }
    //     }

    //     let urls: string[] = []
    //     const post = comment.postId as HydratedDocument<IPost>
    //     let folderId = randomUUID()
    //     if (req?.files) {
    //         urls = await this._s3service.uploadFiles({
    //             files: req.files as Express.Multer.File[],
    //             path: `users/${req?.user?._id}/posts/${(comment.postId as any).folderId}/comments/${folderId}`,
    //             store_type: Store_Enum.memory
    //         })
    //     }

    //     const reply = await this._commentModel.create({
    //         content: content!,
    //         attachments: urls,
    //         postId: post._id,
    //         commentId: comment._id,
    //         tags: mentions,
    //         createdBy: req?.user?._id!,
    //         folderId


    //     })

    //     if (!reply) {
    //         await this._s3service.deleteFiles(urls)
    //         throw new AppError("post not created", 500)
    //     }



    //     if (fcmTokens?.length) {
    //         await this._notificationService.sendNotifications({
    //             tokens: fcmTokens,
    //             data: {
    //                 title: "you are replied in a post",
    //                 body: content ? content : "media post"
    //             }

    //         })
    //     }
    //     successResponse({ res, message: "comment created", data: reply })
    // }

    getComments = async (req: Request, res: Response) => {
        const { postId } = req.params
        const post = await this._postModel.findOne({
            filter: {
                _id: postId,
                ...AvailabilityPost(req)
            }
        })

        if (!post) {
            throw new AppError("post not found", 404)
        }
        const searchQuery = req.query?.search ? { content: { $regex: req.query.search, $options: "i" } } : {}
        const comments = await this._commentModel.paginate({
            page: +req.query.page!,
            limit: +req.query.limit!,
            search: {
                postId,
                commentId: null,
                $or: [...AvailabilityPost(req)],
                ...searchQuery
            },
            populate: [{ path: "reply", populate: [{ path: "reply" }] }]
        })

        successResponse({ res, data: comments })
    }

    likeComment = async (req: Request, res: Response) => {
        const { postId, commentId } = req.params
        const { flag } = req.query

        let updateQuery: any = {
            $addToSet: { likes: req.user?._id! }
        }

        if (flag && flag === "dislike") {
            updateQuery = {
                $pull: { likes: req.user?._id! }
            }
        }

        const comment = await this._commentModel.findOneAndUpdate({
            filter: {
                _id: commentId!,
                refId: postId!,
                $or: [...AvailabilityPost(req)]
            },
            update: updateQuery,

        })

        if (!comment) {
            throw new AppError("comment not found or not authorized", 404)
        }

        successResponse({ res, data: comment })
    }


    updateComment = async (req: Request, res: Response) => {
        const { postId, commentId } = req.params
        const { content, tags, removeFiles, removeTags }: UpdateCommentBodyDto = req.body
        const post = await this._postModel.findOne({
            filter: {
                _id: postId,
                $or: [...AvailabilityPost(req)]
            }
        })

        if (!post) {
            throw new AppError("post not found", 404)
        }
        const comment = await this._commentModel.findOne({
            filter: {
                _id: commentId!,
                refId: postId!,
                createdBy: req.user?._id!
            }
        })
        if (!comment) {
            throw new AppError("comment not found or not authorized", 404)
        }
        if (removeFiles?.length) {
            const invalidFiles = removeFiles.filter((file: string) => {
                return !comment.attachments?.includes(file)
            })
            if (invalidFiles?.length) {
                throw new AppError("some files are invalid", 400)
            }
            await this._s3service.deleteFiles(removeFiles)

            comment.attachments = comment.attachments?.filter((file: string) => {
                return !removeFiles.includes(file)
            }) as string[]
        }

        const updatedTags = new Set(comment?.tags?.map(id => id.toString()) || [])

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

        comment.tags = [...updatedTags].map((id: string) => new Types.ObjectId(id))



        if (req?.files?.length) {
            let urls = await this._s3service.uploadFiles({
                files: req.files as Express.Multer.File[],
                path: `users/${req?.user?._id}/posts/${post.folderId}`,
                store_type: Store_Enum.memory
            })
            comment.attachments?.push(...urls)
        }
        if (content) comment.content = content
        if (fcmTokens?.length) {
            await this._notificationService.sendNotifications({
                tokens: fcmTokens,
                data: {
                    title: "you are mentioned in a comment",
                    body: content ? content : "media comment"
                }

            })
        }



        await comment.save()
        successResponse({ res, data: comment })
    }

    softDeleteComment = async (req: Request, res: Response) => {
        const { commentId } = req.params

        const comment = await this._commentModel.findOne({
            filter: {
                _id: commentId,
            }
        })

        if (!comment) {
            throw new AppError("comment not found", 404)
        }
        const post = await this._postModel.findOne({
            filter: {
                _id:comment.refId,
            }
        })

        if (!post) {
            throw new AppError("post not found", 404)
        }
        const isCommentOwner = comment.createdBy.toString() === req.user._id.toString()
        const isPostOwner = post.createdBy.toString() === req.user._id.toString()
        if (!isCommentOwner || !isPostOwner) {
            throw new AppError("unauthorized", 403)
        }
        await this._commentModel.findByIdAndUpdate({
            id: comment._id,
            update: {
                deletedAt: new Date()
            }
        })

        successResponse({
            res,
            message: "comment soft deleted"
        })
    }
    hardDeleteComment = async (req: Request, res: Response) => {
        const { commentId } = req.params

        const comment = await this._commentModel.findOne({
            filter: {
                _id: commentId,
            }
        })

        if (!comment) {
            throw new AppError("comment not found", 404)
        }
         const post = await this._postModel.findOne({
            filter: {
                _id:comment.refId,
            }
        })

        if (!post) {
            throw new AppError("post not found", 404)
        }
        const isCommentOwner = comment.createdBy.toString() === req.user._id.toString()
        const isPostOwner = post.createdBy.toString() === req.user._id.toString()
        if (!isCommentOwner || !isPostOwner) {
            throw new AppError("unauthorized", 403)
        }
        await this._commentModel.findOneAndDelete({
            filter: {
                _id: comment._id
            }
        })

        successResponse({
            res,
            message: "comment permanently deleted"
        })
    }




}

export default new CommentService()