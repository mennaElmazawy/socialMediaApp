import { Types } from 'mongoose';
import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "../../config/config.service";
import { emailEnum } from '../enum/email.enum.js';
type RedisKeyType = { email: string, subject?: emailEnum }
export class RedisService {
    private readonly redisClient: RedisClientType;
    constructor() {
        this.redisClient = createClient({ url: REDIS_URL })
        this.handleEvent()
    }
    private handleEvent() {
        this.redisClient.on("error", (err) => { console.log("Redis Client Error ❌", err) })
        this.redisClient.on("ready", () => { console.log("Redis Client is ready 👌") })
    }

    public async connect(): Promise<void> {
        try {
            await this.redisClient.connect()
            console.log("Redis connected successfully ✅👍")
        } catch (error) {
            console.log("Redis connection failed", error)
        }
    }

    revoked_key = ({ userId, jti }: { userId: Types.ObjectId | string, jti: string }): string => {
        return `revoke_token::${userId}::${jti}`
    }

    get_key = ({ userId }: { userId: Types.ObjectId | string }): string => {
        return `getkey::${userId}`
    }
    otp_key = ({ email, subject = emailEnum.confirmEmail }: RedisKeyType): string => {
        return `otp::${email}::${subject}`
    }
    max_otp_key = ({ email, subject = emailEnum.confirmEmail }: RedisKeyType): string => {
        return `${this.otp_key({ email, subject })}::max_tries`
    }
    block_otp_key = ({ email, subject = emailEnum.confirmEmail }: RedisKeyType): string => {
        return `${this.otp_key({ email, subject })}::block`
    }
    max_password_key = ({ email }: { email: string }): string => {
        return `max_password_attempts::${email}`
    }
    block_password_key = ({ email }: { email: string }): string => {
        return `block_password::${email}`
    }

    setValue = async ({ key, value, ttl }: { key: string, value: string | object, ttl?: number | undefined }): Promise<string | null> => {
        try {

            const data = typeof value === "string" ? value : JSON.stringify(value);
            return ttl ? await this.redisClient.set(key, data, { EX: ttl }) : await this.redisClient.set(key, data);
        } catch (error) {
            console.error("Error setting value in Redis:", error);
            return null
        }
    };

    update = async ({ key, value, ttl }: { key: string, value: string | object, ttl?: number }): Promise<string | null | number> => {
        try {
            if (!await this.redisClient.exists(key)) {
                return 0
            }

            return await this.setValue({ key, value, ttl });

        } catch (error) {
            console.error("Error updating value in Redis:", error);
            return null
        }
    }

    get = async (key: string): Promise<any> => {
        try {
            try {
                return JSON.parse(await this.redisClient.get(key) as string);
            } catch (error) {
                return await this.redisClient.get(key);
            }
        } catch (error) {
            console.error("Error getting value from Redis:", error);
            return
        }
    }

    del = async (key: string | string[]): Promise<number> => {
        try {
            if (!key.length) return 0
            return await this.redisClient.del(key);
        } catch (error) {
            console.error("Error deleting value from Redis:", error);
            return 0
        }
    }

    ttl = async (key: string): Promise<number> => {
        try {
            return await this.redisClient.ttl(key);
        } catch (error) {
            console.error("Error getting TTL of key in Redis:", error);
            return -2;

        }
    }

    exists = async (key: string): Promise<number> => {
        try {
            return await this.redisClient.exists(key);
        } catch (error) {
            console.error("Error checking existence of key in Redis:", error);
            return -2;
        }
    }

    expire = async ({ key, ttl }: { key: string, ttl: number }): Promise<number> => {
        try {
            return await this.redisClient.expire(key, ttl);
        } catch (error) {
            console.error("Error setting expiration for key in Redis:", error);
            return 0
        }
    }

    keys = async (pattern: string): Promise<string[]> => {
        try {
            return await this.redisClient.keys(`${pattern}*`);
        } catch (error) {
            console.error("Error getting keys from Redis:", error);
            return []
        }
    }
    incr = async (key: string): Promise<number> => {
        try {
            return await this.redisClient.incr(key);
        } catch (error) {
            console.error("Error incrementing value in Redis:", error);
            return -2;

        }
    }

    key(userId: Types.ObjectId) {
        return `user:FCM:${userId}`;
    }
    async addFCM({ userId, FCMToken }: { userId: Types.ObjectId, FCMToken: string }) {
        return await this.redisClient.sAdd(this.key(userId), FCMToken);
    }

    async removeFCM({ userId, FCMToken }: { userId: Types.ObjectId, FCMToken: string }) {
        return await this.redisClient.sRem(this.key(userId), FCMToken);
    }

    async getFCMs(userId: Types.ObjectId) {
        return await this.redisClient.sMembers(this.key(userId));
    }

    async hasFCMs(userId: Types.ObjectId) {
        return await this.redisClient.sCard(this.key(userId));
    }

    async removeFCMUser(userId: Types.ObjectId) {
        return await this.redisClient.del(this.key(userId));
    }

}

export const redisService = new RedisService()