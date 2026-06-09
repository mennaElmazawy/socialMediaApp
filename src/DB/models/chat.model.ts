import mongoose, { Types } from "mongoose";



export interface IMessage {
    createdBy: Types.ObjectId,
    content: string,


}
export interface IChat {
    // ovo
    createdBy: Types.ObjectId,
    participants: Types.ObjectId[],
    messages: IMessage[],
    
    //ovm
    group:string,
    groupImage:string,
    roomId:string,
}

const messageSchema = new mongoose.Schema<IMessage>({
    content: {type: String, required:true},
    createdBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
   
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    },
    strict: true,
    strictQuery: true
})
const ChatSchema = new mongoose.Schema<IChat>({
    // ovo
    createdBy:{
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
    participants:[{
        type: Types.ObjectId,
        ref: "User",
        required: true
    }],
    messages: [messageSchema],
    
    //ovm
    group:String,
    groupImage:String,
    roomId:String,
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    },
    strict: true,
    strictQuery: true
})


const ChatModel = mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema)

export default ChatModel