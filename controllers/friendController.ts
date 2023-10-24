import { Request, Response } from 'express'; 
import mongoose from 'mongoose';
import Friend, { IFriendDocument } from '../models/friend';
import { IExtReq } from '../interfaces/auth';


interface IFriendRequest {
    firstName: string;
    lastName: string;
    dob: Date;
    photo: string;
    bio: string;
    interests: [string];
    tags: mongoose.Types.ObjectId[],
}


export async function addFriend (req : Request & IExtReq, res : Response) {
    try {
        const { firstName, lastName, dob, photo, bio, interests, tags } : IFriendRequest = req.body;

        const newFriend : IFriendDocument = new Friend({
            firstName,
            lastName,
            dob,
            photo,
            bio,
            interests,
            tags,
            user: req.user
        });

        await newFriend.save();

        if (newFriend) res.status(201).json(newFriend);

    } catch (error : any) {
        res.status(400).json({
            error: error.message
        });
    }
}