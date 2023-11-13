import { Request, Response, NextFunction } from "express";
import { UploadedFile } from "express-fileupload";
import sharp from 'sharp';

export default async (req: Request, res: Response, next: NextFunction) => {
    if (req.files && req.files.photo && (req.files.photo as UploadedFile).mimetype.startsWith('image/')) {
        try {
            const image = req.files.photo as UploadedFile;
            const resizedImageBuffer = await sharp(image.data)
                .resize(250, 250) // Resize to 250x250
                .jpeg({ quality: 80 }) // Compress and convert to JPEG
                .toBuffer();

            // Replace original image data with resized and compressed image
            (req.files.photo as UploadedFile).data = resizedImageBuffer;
            (req.files.photo as UploadedFile).mimetype = 'image/jpeg'; // Update mimetype to JPEG
            (req.files.photo as UploadedFile).size = resizedImageBuffer.length; // Update file size

            next();
        } catch (error) {
            next(error);
        }
    }
}