import { Request, Response } from "express"
import UserRepository from "../../DB/repositories/user.repositories.js"
import ChatRepository from "../../DB/repositories/chat.repositories.js"
import { AppError } from "../../common/utils/responses/global_error_handler.js"
import successResponse from "../../common/utils/responses/response.success.js"
import { Server, Socket } from "socket.io"
import { redisService } from "../../common/services/redis.service.js"
import { Types } from "mongoose"
import { randomUUID } from "node:crypto"
import { S3Service } from "../../common/services/s3service.js"



class ChatService {
    private readonly _userModel = new UserRepository()
    private readonly _chatModel = new ChatRepository()
     private readonly _s3service = new S3Service()

    constructor() { }

    //Rest Api
    getChats = async (req: Request, res: Response) => {
        const { userId } = req.params
        const chat = await this._chatModel.findOne({
            filter: {
                participants: {
                    $all: [req.user?._id!, userId]
                },
                group: { $exists: false }
            },
            options: {
                populate: [
                    {
                        path: "participants",
                    }
                ]
            }
        })

        if (!chat) {
            throw new AppError("chat not found", 400)
        }
        successResponse({ res, message: "done", data: { chat } })

    }

    // createGroupChat = async (req: Request, res: Response) => {
    //     const { group, participants } = req.body
    //     const mappedUsers = [... new Set(participants.map((user: string) => {
    //         return Types.ObjectId.createFromHexString(user)
    //     }))]as Types.ObjectId[]
    //     const users = await this._userModel.find({
    //         filter:{
    //             _id:{ $in:mappedUsers},
    //             friends:{  $in:[req.user?._id!]}
    //         }
    //     })
    //     if(users.length !==mappedUsers.length){
    //         throw new AppError("some of id is duplicate")
    //     }
    //     let groupImage:string=''
    //     let roomId=randomUUID()
    //     if (req.file){
    //         groupImage= await this._s3service.uploadFile({
    //             path:"chat",
    //             file:req.file,
    //         }) as string
    //     }
    //     mappedUsers.push(req.user?._id!)
    //     const chat = await this._chatModel.create({
    //         createdBy:req.user?._id!,
    //         group,
    //         groupImage,
    //         messages:[],
    //         roomId,
    //         participants

    //     })
    //     successResponse({ res, message: "done", data: { chat } })

    // }

    //socket.io

    sayHi = async (data: any) => {
        console.log(data)

    }
    sendMessage = async (data: any, socket: Socket, io: Server) => {
        console.log(data)
        const { sendTo, content } = data
        const createdBy = socket.data.user._id
        const user = await this._userModel.findOne({
            filter: { _id: sendTo }
        })
        if (!user) {
            throw new AppError("user not found", 404)
        }
        const chat = await this._chatModel.findOneAndUpdate({
            filter: {
                participants: { $all: [createdBy, sendTo] },
                group: { $exists: false }
            },
            update: {
                $push: {
                    messages: {
                        content,
                        createdBy
                    }
                }
            }
        })
        if (!chat) {
            await this._chatModel.create({
                createdBy,
                messages: [{
                    content,
                    createdBy
                }],
                participants: [sendTo, createdBy]
            })
        }

        io.to(await redisService.getSockets(createdBy)).emit("successMessage", { content })
        io.to(await redisService.getSockets(sendTo)).emit("newMessage", { content, from: socket.data.user })

    }

    
}

export default new ChatService()