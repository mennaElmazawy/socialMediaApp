import { Server, Socket } from "socket.io"
import chatEvent from "./chat.event"

class ChatGateway {
    constructor() { }

    registerEvent = async (socket:Socket, io:Server)=>{
        chatEvent.sayHi(socket)
        chatEvent.sendMessage(socket,io)
    }
}

export default new ChatGateway()