import cron from "node-cron"
import StoryRepository from "./DB/repositories/story.repositories"



const _storyModel=new StoryRepository()
cron.schedule("* * * * *", async () => {
    await _storyModel.deleteMany({
       filter:{
        expiresAt: { $lte: new Date() }
       } 
    })
    //console.log("story deleted")
})