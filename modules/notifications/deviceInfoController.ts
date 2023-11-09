import { Request, Response } from "express";
import { handleError } from "../../utilities/utils";
import { IExtReq } from "../../interfaces/auth";
import deviceInfo from "./models/deviceInfo";
import mongoose from "mongoose";

export async function createOrReassign(req:Request & IExtReq, res:Response){
    try {
        let existingRecord = await deviceInfo.findOne({deviceToken: req.body.token});
        if(existingRecord){
            existingRecord.userId = new mongoose.Types.ObjectId(req.user!);
            await existingRecord.save();
        }else{
            existingRecord = await deviceInfo.create({
                deviceToken: req.body.token,
                userId: req.user
            });
        }
        res.status(200).json({message: "Device token added"});
    } catch (error:any) {
        handleError(res,error);
    }
}