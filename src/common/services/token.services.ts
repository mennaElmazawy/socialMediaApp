import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken'

class TokenServices {
    constructor() { }

    GenerateToken = async ({
        payload,
        secret,
        options
    }: {
        payload: object,
        secret: string,
        options?: SignOptions
    }): Promise<string> => {
        return jwt.sign(payload, secret, options)
    }

    VerifyToken = async ({
        token,
        secret,

    }: {
        token: string,
        secret: string,

    }): Promise<JwtPayload> => {
        return jwt.verify(token, secret) as JwtPayload
    }
}

export default TokenServices