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

        if (newFriend) return res.status(201).json(newFriend);

    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function findFriends (req : Request & IExtReq, res : Response) {
    try {
        const friends = await Friend.find({user: req.user});
        if (friends.length > 0) return res.status(200).json(friends);
        else if (friends.length === 0) return res.status(204).json('No friends found');

    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function deleteFriend (req : Request & IExtReq, res : Response) {
    try {
        const friendId = req.params.id;

        const friend = await Friend.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });
    
        if (friend?.user.toString() === req.user?.toString()) { // verifies that friend is associated with logged in user
            const result = await Friend.findByIdAndDelete(friendId);
            if (result) return res.status(204).json({ message: 'Friend deleted successfully' });
        }

        return res.status(403).json({ message: 'User not authorized for this request' });

    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}