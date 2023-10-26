import { Request, Response } from 'express'; 
import mongoose from 'mongoose';
import Tag from '../models/tag';
import { IExtReq } from '../interfaces/auth';


export async function getTags (req : Request & IExtReq, res : Response) {
    try {
        const tags = await Tag.find({});
        if (!tags) return res.status(404).json({ message: 'Tags not found'});

        return res.status(200).json(tags);
    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}