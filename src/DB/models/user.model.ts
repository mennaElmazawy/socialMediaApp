import mongoose, { HydratedDocument, Types } from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enum/user.enum";
import { SALT_ROUNDS } from "../../config/config.service";
import { Hash } from "../../common/utils/security/hash.security";
import { generateOTP, sendEmail } from "../../common/utils/email/sendEmail.service";
import { eventEmitter } from "../../common/utils/email/email.events";
import { emailEnum } from "../../common/enum/email.enum";
import { emailTemplate } from "../../common/utils/email/email.template";
import PostModel from "./post.model";
import CommentModel from "./comment.model";



export interface IUser {
    firstName: string,
    lastName: string,
    userName?: string,
    email: string,
    password: string,
    age?: number,
    phone?: string,
    address?: string,
    gender?: GenderEnum,
    role: RoleEnum,
    isConfirmed?: Date,
    provider?: ProviderEnum,
    changeCredential?: Date,
    profilePic?: string,
    friends?:Types.ObjectId[],
    deletedAt?:Date,
    fcmTokens?: string[]


}


const userSchema = new mongoose.Schema<IUser>({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 25
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 25
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: function (): boolean {
            return this.provider == ProviderEnum.local ? true : false
        },
        min: 6,
        max: 25
    },
    age: {
        type: Number,
        min: 18,
        max: 60
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        enum: GenderEnum,
        default: GenderEnum.male
    },
    provider: {
        type: String,
        enum: ProviderEnum,
        default: ProviderEnum.local
    },
    role: {
        type: String,
        enum: RoleEnum,
        default: RoleEnum.user
    },
    isConfirmed: {
        type: Date,

    },
    changeCredential: Date,
    profilePic: String,
    friends:[{
        type: Types.ObjectId,
        ref: "User"
    }],
    deletedAt:{
        type: Date,

    },
    fcmTokens: [{
    type: String
}]

}, {
    timestamps: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

userSchema.virtual("userName").get(function () {
    return this.firstName + " " + this.lastName;
}).set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.set({ firstName, lastName });


})

userSchema.post("findOneAndUpdate", async function (doc) {
    if (!doc) return
    if (!doc.deletedAt) return
    await PostModel.updateMany(
        {
            createdBy: doc._id
        },
        {
            deletedAt: doc.deletedAt,
        }
    )

    await CommentModel.updateMany(
        {
            createdBy: doc._id
        },
        {
            deletedAt: doc.deletedAt,
            deletedBy: doc.deletedBy
        }
    )

})

userSchema.post("findOneAndDelete", async function (doc) {

    if (!doc) return

    await PostModel.deleteMany({
        createdBy: doc._id
    })

    await CommentModel.deleteMany({
        createdBy: doc._id
    })

})

// userSchema.pre("validate", function () {
// console.log("pre validate hook called");
// })

// userSchema.post("validate", function () {
//     console.log("post validate hook called");
// })

// userSchema.pre("save", function (this:HydratedDocument<IUser> & {is_new:boolean}) {
//     console.log("pre save hook called");
//     this.is_new = this.isNew
//     if(this.isModified("password")){
//         this.password =Hash({plainText:this.password,salt_Rounds:SALT_ROUNDS})
//     }
// })

// userSchema.post("save", async function () {
//     console.log("post save hook called");
//     const that = this as HydratedDocument<IUser> & { is_new: boolean }
//     if (that.is_new) {
//         const otp = await generateOTP()
//         eventEmitter.emit(emailEnum.confirmEmail, async () => {
//             await sendEmail({
//                 to: this.email,
//                 subject: emailEnum.confirmEmail,
//                 html: emailTemplate(otp)

//             })
//         })
//     }

// })


// userSchema.pre("insertMany", function ( doc) {
//     console.log("pre insertMany hook called");
//     console.log(doc)
// })
// userSchema.post("insertMany", function ( doc) {
//     console.log("post insertMany hook called");
//     console.log(doc)
// })

// userSchema.pre(["findOne","find","countDocuments"], function () {
//     console.log("pre findOne hook called");
//     const { paronid, ...rest } = this.getQuery()
//     if (paronid == false) {
//         this.setQuery({ ...rest })
//     } else {
//         this.setQuery({ ...rest, deletedAt: { $exists: false } })
//     }
// })

const UserModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default UserModel