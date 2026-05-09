import mongoose, { Types } from "mongoose";

export interface INotification{
title:string,
body:string,
sentTo:Types.ObjectId[],
createdBy:Types.ObjectId,
createdAt?:Date,
updatedAt?: Date
}
const notificationSchema = new mongoose.Schema<INotification>({
    title: {
        type: String,
        required: true
    },

    body: {
        type: String,
        required: true
    },

    sentTo: [{
        type: Types.ObjectId,
        ref: "User"
    }],

    createdBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },

    createdAt: Date,

}, {
    timestamps: true
})

const NotificationModel=mongoose.models.Notification|| mongoose.model<INotification>("Notification",notificationSchema)
export default NotificationModel