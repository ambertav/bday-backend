import { S3Client,  PutObjectCommand } from '@aws-sdk/client-s3';

const s3Config = {
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
};

const s3Client = new S3Client(s3Config);
const s3BaseUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/`;

export { s3Client, s3BaseUrl, PutObjectCommand };