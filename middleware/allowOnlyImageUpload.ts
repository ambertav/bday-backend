import { NextFunction, Request, Response } from "express";
import { UploadedFile } from "express-fileupload";

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.files && Object.keys(req.files).length && req.files!.photo) {
            const file: UploadedFile = req.files!.photo as UploadedFile;
            if (file.mimetype.startsWith('image/')) {
                return next();
            } else {
                return res.status(403).json({ message: "Only image files are allowed." });
            }
        }
    } catch (error) {
        next(error);
    }
}