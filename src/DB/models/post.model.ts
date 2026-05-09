import { Allow_comment_Enum, Availability_Enum } from './../../common/enum/post.enum';
import mongoose, { Types } from "mongoose";
import CommentModel from './comment.model';



export interface IPost{
    content?: string,
    attachments?: string[],

    createdBy:Types.ObjectId,

    tags?: Types.ObjectId[],
    likes?: Types.ObjectId[],

    allowComment?: Allow_comment_Enum,
    availability?: Availability_Enum

    folderId:string,
    deletedAt?:Date
}

const PostSchema= new mongoose.Schema<IPost>({
    content:{
        type:String, min:1 , required: function(this){
            return !this.attachments?.length
        }
    },
    attachments:[String],
    createdBy:{
        type:Types.ObjectId,
        ref:"User",
        required:true
    },
    tags:[{
        type:Types.ObjectId,
        ref:"User"
    }],
    likes:[{
        type:Types.ObjectId,
        ref:"User"
    }],
    allowComment:{
        type:String,
        enum: Allow_comment_Enum,
        default: Allow_comment_Enum.allow
    },
    availability:{
        type:String,
        enum: Availability_Enum,
        default: Availability_Enum.public
    },
    folderId:{
        type:String,
        
    },
    deletedAt:{
        type:Date
    }
},{
    timestamps:true,
    toJSON:{
        virtuals:true
    },
    toObject:{
        virtuals:true
    },
    strict:true,
    strictQuery:true
})
PostSchema.virtual("comments",{
    ref:"Comment",
    localField:"_id",
    foreignField:"postId",
    justOne:true,
})


PostSchema.post("findOneAndUpdate", async function (doc) {

    if (!doc) return
    if (!doc.deletedAt) return

    await CommentModel.updateMany(
        {
            postId: doc._id
        },
        {
            deletedAt: doc.deletedAt
        }
    )

})

PostSchema.post("findOneAndDelete", async function (doc) {

    if (!doc) return

    await CommentModel.deleteMany({
        postId: doc._id
    })

})

const PostModel=mongoose.models.Post|| mongoose.model<IPost>("Post",PostSchema)

export default PostModel