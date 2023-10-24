import { Request, Response } from "express";
import { S3Client } from "@aws-sdk/client-s3";
import multer from 'multer';
import multerS3 from 'multer-s3';
import UserProfile from "../models/userProfile";
import { HTTPError, sendError } from "../utilities/utils";
import { IUserProfileDetails } from "../interfaces/userProfile";
import { IExtReq } from "../interfaces/auth";

const { AWS_REGION, AWS_SECRET, AWS_S3_BUCKET, AWS_ID } = process.env!;

export async function updateProfileDetails(req: Request & IExtReq, res: Response) {
    try {
        const details: Partial<IUserProfileDetails> = req.body;
        const allowedKeys: (keyof IUserProfileDetails)[] = ['dob', 'bio'];
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
    try {       
        const s3Client = new S3Client({ region: AWS_REGION, credentials: { accessKeyId: AWS_ID!, secretAccessKey: AWS_SECRET! } });
        const upload = multer({
            storage: multerS3({
                s3: s3Client,
                bucket: AWS_S3_BUCKET!,
                key: function (req: Request & IExtReq, file, cb) {
                    cb(null, req.user?.toString())
                }
            })
        }).single('photo');
        upload(req, res, function (err) {
            if (err) {
                throw { status: 500, message: err.message };
            }
            res.status(200).json({ message: 'Photo uploaded successfully' });
        });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}