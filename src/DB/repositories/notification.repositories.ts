import { Model } from "mongoose";
import NotificationModel, { INotification } from "../models/notification.model";
import BaseRepository from "./base.repositories";


class NotificationRepository extends BaseRepository<INotification>{
    constructor(protected readonly model: Model<INotification>=NotificationModel){
        super(model)
    }

}

export default NotificationRepository