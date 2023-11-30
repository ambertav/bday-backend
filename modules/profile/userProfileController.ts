import { Request, Response } from "express";
import UserProfile from "./models/userProfile";
import User from "../user/models/user";
import { HTTPError, sendError } from "../../utilities/utils";
import { IUserProfileDetails } from "../../interfaces/userProfile";
import { IExtReq } from "../../interfaces/auth";
import { s3Client, s3BaseUrl, PutObjectCommand } from '../../utilities/s3upload';
import { UploadedFile } from 'express-fileupload';
import { daysUntilBirthday } from "../../utilities/friendUtilities";

export async function updateProfileDetails(req: Request & IExtReq, res: Response) {
    try {
        const details: Partial<IUserProfileDetails> = req.body;
        const allowedKeys: (keyof IUserProfileDetails)[] = [
            'interests',
            'bio',
            'dob',
            'gender',
            'location',
            'tel',
            'name',
            'timezone',
            'emailNotifications',
            'pushNotifications'
        ];
        const profile = await UserProfile.findOne({ user: req.user });
        if (!profile) throw { status: 404, message: "Profile not found" };

        for (let key of allowedKeys) {
            if (details.hasOwnProperty(key)) {
                (profile as any)[key] = details[key];
            }
        }
        await profile.save();
        res.status(200).json({ message: "User profile updated", profile });

    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}

export async function getUserProfile(req: Request & IExtReq, res: Response) {
    try {
        const profile = await UserProfile.findOne({ user: req.user });
        if (!profile) throw { status: 404, message: "Profile not found" };
        res.status(200).json({ profile });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}

export async function uploadUserPhoto(req: Request & IExtReq, res: Response) {
    const file = req.files!.photo as UploadedFile;
    const fileType = file.name.split('.')[1];
    const fileData = file.data
    const fileName = `${req.user}.${fileType}`

    const bucketParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: fileData
    };

    try {
        const result = await s3Client.send(new PutObjectCommand(bucketParams));
        const s3ProfilePhotoUrl = `${s3BaseUrl}${bucketParams.Bucket}/${fileName}`;

        try {
            const profile = await UserProfile.findOne({ user: req.user });
            if (!profile) throw { status: 404, message: "Profile not found" };

            profile.photo = s3ProfilePhotoUrl;
            await profile.save();

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

// profile + user info
export async function getCurrentUser(req: Request & IExtReq, res: Response) {
    try {
        const profile = await UserProfile.findOne({ user: req.user });
        const user = await User.findById(req.user);
        if (!user || !profile) throw { status: 404, message: "User or profile not found" };

        const expandedProfile = {
            ...profile.toJSON(),
            daysUntilBirthday: daysUntilBirthday(profile.dob, profile.timezone)
        }

        res.status(200).json({ user, profile: expandedProfile });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}