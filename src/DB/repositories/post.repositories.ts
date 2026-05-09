import { Model } from "mongoose";
import PostModel, { IPost } from "../models/post.model";
import BaseRepository from "./base.repositories";


class PostRepository extends BaseRepository<IPost>{
    constructor(protected readonly model: Model<IPost>=PostModel){
        super(model)
    }

}

export default PostRepository