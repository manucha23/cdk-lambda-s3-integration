import { Handler } from 'aws-lambda';
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {S3Client, GetObjectCommand} from "@aws-sdk/client-s3";


//create s3 presigned url

export const handler: Handler = async (event) => {
    const s3BucketName = process.env.S3_BUCKET_NAME;
    const client = new S3Client({});
    const presignedUrl = await getSignedUrl(client, 
        new GetObjectCommand({Bucket: s3BucketName, Key: event.key}), 
        {expiresIn: 3600});

    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: presignedUrl }),
    };
}; 