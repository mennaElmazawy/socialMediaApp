import { Model } from "mongoose";
import CommentModel, { IComment } from "../models/comment.model";
import BaseRepository from "./base.repositories";


class CommentRepository extends BaseRepository<IComment>{
    constructor(protected readonly model: Model<IComment>=CommentModel){
        super(model)
    }

}

export default CommentRepository