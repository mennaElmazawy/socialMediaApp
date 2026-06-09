import { Server } from "socket.io"
import { Server as HttpServer } from "http"
import { decodeToken_and_fetchUser } from "../../common/middleware/authentication"
import { redisService } from "../../common/services/redis.service"
import chatGateway from "../chat/realtime/chat.gateway.js"

class SocketGateway {
    constructor() { }
    initIo = async (httpServer: HttpServer) => {
        const io = new Server(httpServer, {
            cors: {
                origin: "*"
            }
        })

        io.use(async (socket, next) => {
            try {
                //  console.log(socket.handshake.auth.authorization);
                const { user } = await decodeToken_and_fetchUser(
                    socket.handshake.auth.authorization || socket.handshake.headers.authorization
                )
                socket.data.user = user
                next()


            } catch (error: any) {
                next(error)
            }

        })
        io.on("connection", async (socket) => {
            redisService.addSocket({ userId: socket.data.user._id, SocketId: socket.id })
            console.log({ userSocketsIds: await redisService.getSockets(socket.data.user._id) })

            await chatGateway.registerEvent(socket,io)

            socket.on("disconnect", async () => {
                await redisService.removeSocket({ userId: socket.data.user._id, SocketId: socket.id })
                console.log({ userSocketsIdsAfterDisconnect: await redisService.getSockets(socket.data.user._id) })


            })
        })
    }
}

export default new SocketGateway()