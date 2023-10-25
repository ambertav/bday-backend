import { S3Client,  PutObjectCommand } from '@aws-sdk/client-s3';

const s3Config = {
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ID!,
        secretAccessKey: process.env.AWS_SECRET!,
    }
};

const s3Client = new S3Client(s3Config);
const s3BaseUrl = 'https://s3.us-east-2.amazonaws.com/';

export { s3Client, s3BaseUrl, PutObjectCommand };