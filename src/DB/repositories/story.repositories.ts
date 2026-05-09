import { Model } from "mongoose";
import BaseRepository from "./base.repositories";
import StoryModel, { IStory } from "../models/story.model";


class StoryRepository extends BaseRepository<IStory>{
    constructor(protected readonly model: Model<IStory>=StoryModel){
        super(model)
    }

}

export default StoryRepository