import { Request } from "express"
import { Availability_Enum } from "../../enum/post.enum.js"


export const AvailabilityPost = (req: Request) => {
    return [
        { availability: Availability_Enum.public },
        { availability: Availability_Enum.only_me, createdBy: req.user?._id! },
        { availability: Availability_Enum.friends, createdBy: { $in: [...(req.user?.friends || []), req.user?._id] } },
        { tags: { $in: [req.user?._id] } }
    ]

}