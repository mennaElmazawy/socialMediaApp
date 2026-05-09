
import { Allow_comment_Enum, Availability_Enum } from './../../common/enum/post.enum';
import mongoose, { HydratedDocument, Types } from "mongoose";
import { IUser } from './user.model';
import { IPost } from './post.model';



export interface IComment {
    content?: string,
    attachments?: string[],

    createdBy: Types.ObjectId | IUser,
    updatedBy?: Types.ObjectId | IUser,

    tags?: Types.ObjectId[] | IUser[],
    likes?: Types.ObjectId[] | IUser[],

    postId: Types.ObjectId | IPost,
    commentId?: Types.ObjectId | IComment,

    createdAt: Date,
    updatedAt?: Date,
    deletedAt?: Date,
    restoredAt?: Date


}

const commentSchema = new mongoose.Schema<IComment>({
    content: {
        type: String, min: 1, required: function (this) {
            return !this.attachments?.length
        }
    },
    attachments: [String],
    tags: [{
        type: Types.ObjectId,
        ref: "User"
    }],
    likes: [{
        type: Types.ObjectId,
        ref: "User"
    }],
    postId: {
        type: Types.ObjectId,
        ref: "Post",
        required: true
    },
    commentId: {
        type: Types.ObjectId,
        ref: "Comment"
    },
    updatedBy: {
        type: Types.ObjectId,
        ref: "User"
    },
    createdBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },

    deletedAt: Date,
    restoredAt: Date,

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


commentSchema.virtual("reply",{
    ref:"Comment",
    localField:"_id",
    foreignField:"commentId",
    justOne:true
})
commentSchema.post("findOneAndUpdate", async function (doc) {

    if (!doc?.deletedAt) return

    await CommentModel.updateMany(
        {
            commentId: doc._id
        },
        {
            deletedAt: doc.deletedAt
        }
    )

})

commentSchema.post("findOneAndDelete", async function (doc) {

    if (!doc) return

    await CommentModel.deleteMany({
        commentId: doc._id
    })

})
// userSchema.pre(["findOne","find","countDocuments"], function () {
//     console.log("pre findOne hook called");
//     const { paronid, ...rest } = this.getQuery()
//     if (paronid == false) {
//         this.setQuery({ ...rest })
//     } else {
//         this.setQuery({ ...rest, deletedAt: { $exists: false } })
//     }
// })



// commentSchema.pre(["deleteOne","findOneAndDelete"], function () {
//     if (this.getQuery().force==true){
//         this.setQuery({ ...this.getQuery() })
//     }else{
//         this.setQuery({
//             ...this.getQuery(),
//             deletedAt: { $exists: true }
//         })
//     }
// })

const CommentModel = mongoose.models.Comment || mongoose.model<IComment>("Comment", commentSchema)

export default CommentModel