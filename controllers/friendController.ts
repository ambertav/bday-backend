import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Friend, { IFriendDocument } from '../models/friend';
import { IExtReq } from '../interfaces/auth';
import { HTTPError, sendError } from '../utilities/utils';
import Tag from '../models/tag';
import { UploadedFile } from 'express-fileupload';
import { PutObjectCommand, s3BaseUrl, s3Client } from '../utilities/s3upload';


interface IFriendRequest {
    name: string;
    location: string;
    dob: Date;
    photo: string;
    bio: string;
    interests: string[];
    tags: mongoose.Types.ObjectId[],
    giftPreferences: string[];
}


export async function addFriend(req: Request & IExtReq, res: Response) {
    try {
        const { name, location, dob, bio, interests, tags, giftPreferences }: IFriendRequest = req.body;

        const newFriend: IFriendDocument = new Friend({
            name,
            location,
            dob,
            bio,
            interests,
            tags,
            giftPreferences,
            user: req.user
        });

        await newFriend.save();

        if (newFriend) return res.status(201).json(newFriend);

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function findFriends(req: Request & IExtReq, res: Response) {
    try {
        const friends = await Friend.find({ user: req.user });
        if (friends.length > 0) return res.status(200).json(friends);
        else if (friends.length === 0) return res.status(204).json('No friends found');

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function showFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        const friend = await Friend.findOne({ _id: friendId, user: req.user });
        if (!friend) return res.status(404).json('Friend not found');

        return res.status(200).json(friend);

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function deleteFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;

        const friend = await Friend.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });

        if (friend?.user.toString() === req.user?.toString()) { // verifies that friend is associated with logged in user
            const result = await Friend.findByIdAndDelete(friendId);
            if (result) return res.status(204).json({ message: 'Friend deleted successfully' });
        }

        return res.status(403).json({ message: 'User not authorized for this request' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function updateFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;

        const friend = await Friend.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });

        if (friend?.user.toString() === req.user?.toString()) { // Verify that friend is associated with the logged in user
            const { interests, ...others } = req.body;

            const updateFields = {
                ...others,
                interests,
            };

            delete updateFields.user; // so that it can't update the user
            delete updateFields.photo; // use photo upload endpoint instead
            const result = await Friend.updateOne({ _id: friendId }, { $set: updateFields });
            if (result) return res.status(204).json({ message: 'Friend updated' });
        }

        return res.status(403).json({ message: 'User not authorized for this request' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function addTag(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        const friend = await Friend.findById(friendId);
        if (!friend) throw { status: 404, message: "Friend not found" };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: "User not authorized for this request" }
        let { title, type } = req.body;
        title = title.toLowerCase();
        type = type ? type.toLowerCase() : "custom";
        let existingTag = await Tag.findOne({ title });
        let tagCreated = false;
        if (!existingTag || existingTag.type !== type) {
            existingTag = await Tag.create({ title, type });
            tagCreated = true;
        }
        if (!friend.tags.includes(existingTag._id)) {
            friend.tags.push(existingTag._id);
            await friend.save();
        }
        const statusCode = tagCreated ? 201 : 200;
        res.status(statusCode).json({ _id: existingTag._id });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function removeTag(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        const tagId = req.params.tagId;
        const friend = await Friend.findById(friendId);
        if (!friend) throw { status: 404, message: "Friend not found" };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: "User not authorized for this request" }
        const tag = await Tag.findById(tagId);
        if (!tag) throw { status: 404, message: "Tag not found" };
        const idx = friend.tags.findIndex(el => tag._id.equals(el));
        if (idx > -1) {
            friend.tags.splice(idx, 1);
            await friend.save();
            return res.status(200).json({ message: "Tag removed" });
        } else {
            return res.status(204).json({});
        }
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function addPreference(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        let { preference } = req.body;
        preference = preference.toLowerCase();
        const friend = await Friend.findById(friendId);
        if (!friend) {
            throw { status: 404, message: 'Friend not found' };
        }
        if (!friend.giftPreferences.includes(preference)) {
            friend.giftPreferences.push(preference);
            await friend.save();
        }
        res.status(200).json({ friend });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function removePreference(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        let { preference } = req.body;
        preference = preference.toLowerCase();
        const friend = await Friend.findById(friendId);
        if (!friend) {
            throw { status: 404, message: 'Friend not found' };
        }
        const index = friend.giftPreferences.indexOf(preference);
        if (index > -1) {
            friend.giftPreferences.splice(index, 1);
            await friend.save();
        }
        res.status(200).json({ friend });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function uploadFriendPhoto(req: Request & IExtReq, res: Response) {
    try {
        const file = req.files!.photo as UploadedFile;
        const fileType = file.name.split('.')[1];
        const fileData = file.data
        const friend = await Friend.findById(req.params.id);
        if(!friend) return res.status(404).json({message: "Friend not found"});
        if (friend?.user.toString() !== req.user?.toString()) return res.status(403).json({message: "User not authorized for this request" });
        const fileName = `${req.params.id}.${fileType}`
    
        const bucketParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: fileData
        };
        const result = await s3Client.send(new PutObjectCommand(bucketParams));
        const s3ProfilePhotoUrl = `${s3BaseUrl}${bucketParams.Bucket}/${fileName}`;

        try {
            friend.photo = s3ProfilePhotoUrl;
            await friend.save();

            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).json({ photoUrl: s3ProfilePhotoUrl, message: 'Photo uploaded successfully' });

        } catch (userError) {
            console.error('Error updating user profile photo:', userError);
            res.status(500).send('Error updating user profile photo');
        }
    } catch (s3Error) {
        console.error('Error uploading profile photo to AWS S3:', s3Error);
        res.status(500).send('Error uploading profile photo to AWS S3');
    }
}