import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLInt, GraphQLBoolean, GraphQLList } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import { PORT } from "./config/config.service";
import { globalErrorHandler } from "./common/utils/responses/global_error_handler";
import { AppError } from "./common/utils/responses/global_error_handler";
import authRouter from "./modules/auth/auth.controller";
import { checkConnectionDB } from "./DB/connectionDB";
import { redisService } from "./common/services/redis.service";
import userRouter from "./modules/users/user.controller";
import { S3Service } from "./common/services/s3service";
import { pipeline } from "stream/promises";
import successResponse from "./common/utils/responses/response.success";
import NotificationService from "./common/services/notification.service";
import postRouter from "./modules/posts/post.controller";
import storyRouter from "./modules/story/story.controller";
import "./cron"
import notificationRouter from "./modules/notification/notification.controller";





const app: express.Application = express();
const port: number = Number(PORT);
const bootstrap = () => {

    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: "Too many requests from this IP, please try again after 15 minutes",
        handler: (req: Request, res: Response, next: NextFunction) => {

            throw new AppError("Too many requests from this IP, please try again after 15 minutes", 429);
        },
        legacyHeaders: false,
    })

    app.use(express.json());
    app.use(cors(), helmet(), limiter);

    checkConnectionDB()
    redisService.connect()
    const users = [{ id: 1, name: "first", age: 25 },
    { id: 2, name: "second", age: 26 },
    { id: 3, name: "third", age: 27 }
    ]
    let queryObject = new GraphQLObjectType({
        name: "getUser",
        fields: {
            id: { type: GraphQLInt },
            name: { type: GraphQLString },
            age: { type: GraphQLInt },

        }
    })
    const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
            name: "query",
            description: "query info",
            fields: {
                hi: {
                    type: new GraphQLNonNull(GraphQLString),
                    resolve: (): string => {
                        return "hi"
                    }
                },
                hello: {
                    type: GraphQLInt,
                    resolve: (): number => {
                        return 5
                    }
                },
                getBoolean: {
                    type: GraphQLBoolean,
                    resolve: (): boolean => {
                        return true
                    }
                },
                getUsers: {
                    type: queryObject,
                    args: {
                        id: { type: new GraphQLNonNull(GraphQLInt) },
                    },

                    resolve: (parent, args) => {
                        const user = users.find(user => user.id == args.id)
                        if (!user) {
                            throw new AppError("user not exist")
                        }
                        return user
                    }
                },
                listUsers: {
                    type: new GraphQLList(queryObject),
                    resolve: () => {
                        return users
                    }
                }

            }
        })
    })
    app.use("/graphql", createHandler({ schema }))

    app.get("/", async (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({ message: "welcome to social app " });
    });
    app.post("/send-notification", async (req: Request, res: Response, next: NextFunction) => {
        NotificationService.sendNotification({
            token: req.body.token,
            data: {
                title: "Hello from social media app",
                body: "This is a test notification"
            }
        })
    });

    app.get("/upload/deletefile", async (req: Request, res: Response, next: NextFunction) => {
        const { Key } = req.query as { Key: string }
        let result = await new S3Service().deleteFile(Key)
        successResponse({ res, data: result })
    })

    app.get("/upload/deletefiles", async (req: Request, res: Response, next: NextFunction) => {
        const { Keys } = req.body as { Keys: string[] }
        let result = await new S3Service().deleteFiles(Keys)
        successResponse({ res, data: result })
    })

    app.get("/upload/deleteFolder", async (req: Request, res: Response, next: NextFunction) => {
        const { folderName } = req.body as { folderName: string }
        let result = await new S3Service().deleteFolder(folderName)
        successResponse({ res, data: result })
    })

    app.get("/upload", async (req: Request, res: Response, next: NextFunction) => {
        const { folderName } = req.query as { folderName: string }
        let result = await new S3Service().getFiles(folderName)
        let resultMapped = result.Contents?.map((file) => {
            return { Key: file.Key }
        })

        successResponse({ res, data: resultMapped })
    })

    app.get("/upload/pre-signed/*path", async (req: Request, res: Response, next: NextFunction) => {
        const { path } = req.params as { path: string[] }
        const Key = path.join("/") as string
        const { download } = req.query as { download: string }

        const url = await new S3Service().getPreSignedUrl({ Key, download: download ? download : undefined })
        successResponse({ res, data: url })
    })
    app.get("/upload/*path", async (req: Request, res: Response, next: NextFunction) => {
        const { path } = req.params as { path: string[] }
        const Key = path.join("/") as string
        const { download } = req.query
        const result = await new S3Service().fetFile(Key)
        const stream = result.Body as NodeJS.ReadableStream
        res.setHeader("Content-Type", result.ContentType!)
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        if (download && download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${path.pop()}"`);

        }
        await pipeline(stream, res)
    })
    app.use("/auth", authRouter)
    app.use("/users", userRouter)
    app.use("/posts", postRouter)
    app.use("/story", storyRouter)
    app.use("/notification", notificationRouter)

    app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
        throw new AppError(`url ${req.originalUrl} with method ${req.method} not found`, 404);
    });

    app.use(globalErrorHandler)


    app.listen(PORT, () => {
        console.log(`Server is running on port ${port}`);
    }
    );
}

export default bootstrap