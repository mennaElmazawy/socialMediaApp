import multer from "multer";
import { Multer_Enum, Store_Enum } from "../enum/multer.enum";
import { tmpdir } from "os";
import { Request } from "express";
import { AppError } from "../utils/responses/global_error_handler.js";


const multerCloud = ({
    store_type=Store_Enum.memory,
    custom_Types=Multer_Enum.image,
    maxFileSize=5 * 1024 * 1024,
}:{
    store_type?:Store_Enum,
    custom_Types?:string[],
    maxFileSize?:number
}={}) => {
    const storage = store_type === Store_Enum.memory ? multer.memoryStorage() : multer.diskStorage({
        destination: tmpdir(),
        filename: function (req:Request, file:Express.Multer.File, cb:Function) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            cb(null, uniqueSuffix + "_" + file.originalname)
        }
    });

    const fileFilter = (req:Request, file:Express.Multer.File, cb:Function) => {
        if (!custom_Types.includes(file.mimetype)) {
           return cb(new AppError("invalid file type"))
        }
        cb(null, true)
    }

    const upload = multer({ storage,fileFilter, limits: { fileSize: maxFileSize } })
    return upload
}

export default multerCloud;
