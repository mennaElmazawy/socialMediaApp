import mongoose from "mongoose";
import { MONGO_URI, MONGO_URI_ONLINE } from "../config/config.service";

export const checkConnectionDB= async ()=>{
    try {
        await mongoose.connect(MONGO_URI, {serverSelectionTimeoutMS:30000})
        console.log("DB connected successfully ✅❤️")
    } catch (error) {
        console.log("DB connection failed ❌",error)
    }   
}