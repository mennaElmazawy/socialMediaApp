import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, ObjectCannedACL, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AWS_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "../../config/config.service";
import { Store_Enum } from "../enum/multer.enum";
import { randomUUID } from 'node:crypto';
import fs from "fs"
import { AppError } from '../utils/responses/global_error_handler.js';
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";



export class S3Service {

    private client: S3Client

    constructor() {
        this.client = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            }
        })
    }

    async uploadFile({
        file,
        store_type = Store_Enum.memory,
        path = "General",
        ACL = ObjectCannedACL.private
    }: {
        file: Express.Multer.File,
        store_type?: Store_Enum,
        path?: string,
        ACL?: ObjectCannedACL
    }): Promise<string> {

        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            ACL,
            Key: `social_media_app/${path}/${randomUUID()}__${file.originalname}`,
            Body: store_type === Store_Enum.memory ? file.buffer : fs.createReadStream(file.path),
            ContentType: file.mimetype
        })
        if (!command.input.Key) {
            throw new AppError("Failed to upload file ", 500)
        }
        await this.client.send(command)
        return command.input.Key
    }


    async uploadLargeFile({
        file,
        store_type = Store_Enum.disk,
        path = "General",
        ACL = ObjectCannedACL.private
    }: {
        file: Express.Multer.File,
        store_type?: Store_Enum,
        path?: string,
        ACL?: ObjectCannedACL
    }): Promise<string> {

        const command = new Upload({
            client: this.client,
            params: {
                Bucket: AWS_BUCKET_NAME,
                ACL,
                Key: `social_media_app/${path}/${randomUUID()}__${file.originalname}`,
                Body: store_type === Store_Enum.memory ? file.buffer : fs.createReadStream(file.path),
                ContentType: file.mimetype
            }
        })
        const result = await command.done()
        command.on("httpUploadProgress", (progress) => {
            console.log(progress)
        })

        return result.Key as string
    }


    async uploadFiles({
        files,
        store_type = Store_Enum.memory,
        path = "General",
        ACL = ObjectCannedACL.private,
        isLarge = false
    }: {
        files: Express.Multer.File[],
        store_type?: Store_Enum,
        path?: string,
        ACL?: ObjectCannedACL,
        isLarge?: boolean
    }): Promise<string[]> {

        let urls: string[] = []

        if (isLarge) {
            urls = await Promise.all(files.map((file) => {
                return this.uploadLargeFile({ file, store_type, path, ACL })
            }))
        } else {
            urls = await Promise.all(files.map((file) => {
                return this.uploadFile({ file, store_type, path, ACL })
            }))
        }
        return urls
    }


    async createPreSignedUrl({
        fileName,
        ContentType,
        path,
        expiresIn = 60
    }: {
        fileName: string,
        ContentType: string,
        path: string,
        expiresIn?: number
    }) {
        const Key = `social_media_app/${path}/${randomUUID()}__${fileName}`
        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key,
            ContentType
        })
        const url = await getSignedUrl(this.client, command, { expiresIn })
        return { url, Key }
    }

    async fetFile(Key: string) {
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key
        })
        return await this.client.send(command)

    }

    async getPreSignedUrl({
        Key,
        expiresIn = 60,
        download
    }: {
        Key: string,
        expiresIn?: number,
        download?: string | undefined
    }) {
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key,
            ResponseContentDisposition: download ? `attachment; filename="${Key.split("/").pop()}"` : undefined
        })
        const url = await getSignedUrl(this.client, command, { expiresIn })
        return url
    }

    async getFiles(folderName: string) {
        const command = new ListObjectsV2Command({
            Bucket: AWS_BUCKET_NAME,
            Prefix: `social_media_app/${folderName}/`
        })
        return await this.client.send(command)

    }
    async deleteFile(Key: string) {
        const command = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key
        })
        return await this.client.send(command)

    }
    async deleteFiles(Keys: string[]) {
        const command = new DeleteObjectsCommand({
            Bucket: AWS_BUCKET_NAME,
            Delete: {
                Objects: Keys.map((Key) => ({ Key }))
            }
        })
        return await this.client.send(command)

    }

    async deleteFolder(folderName: string) {
        const data = await this.getFiles(folderName)
        const Keys = data?.Contents?.map((file) => file.Key)
        return await this.deleteFiles(Keys as string[])
    } 
}