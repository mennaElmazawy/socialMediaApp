import mongoose, { Types } from "mongoose"
import { IUser } from "./user.model.js"
import { Availability_Enum } from "../../common/enum/post.enum"

export interface IStory {
    content?: string,
    attachments?: string[],

    createdBy: Types.ObjectId | IUser,

    createdAt: Date,
    expiresAt: Date
    updatedAt?: Date,
    deletedAt?: Date,
    availability?: Availability_Enum,
    folderId:string,



}

const storySchema = new mongoose.Schema<IStory>({
    content: {
        type: String, min: 1, required: function (this) {
            return !this.attachments?.length
        }
    },
    attachments: [String],


    createdBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
    availability: {
        type: String,
        enum: Availability_Enum,
        default: Availability_Enum.public
    },
    folderId:{
        type:String,
        
    },
        
    expiresAt: {
        type: Date,
        default: function () {
            return new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
    },

    deletedAt: Date,

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

const StoryModel = mongoose.models.Story || mongoose.model<IStory>("Story", storySchema)

export default StoryModel
