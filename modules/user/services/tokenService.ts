import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import { digest } from '../../../utilities/cryptoService';
import { hashString, compareHash } from '../../../utilities/cryptoService';
import RefreshToken, { IRefreshTokenDocument } from '../models/refreshToken';
import { toSeconds } from '../../../utilities/utils';
import { idempotencyCache, lockCache, refreshTokenCache } from '../../../utilities/cache';

const { AUTH_JWT_SECRET, AUTH_JWT_EXPIRE, AUTH_REFRESH_SECRET, AUTH_REFRESH_EXPIRE } = process.env;

/**
 * Parses a given jwt using base64url and returns its payload
 * @param token 
 * @returns payload
 */
export function parseJwt(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

/**
 * Creates a signed jwt with the given payload
 * @param user payload of the token
 * @returns signed token
 */
export function createJwt (payload: any, secret : any, expires: any) {
    return jwt.sign(
        // data payload
        { payload },
        (secret as Secret),
        { expiresIn: expires }
    );
}

export function createRefreshToken(payload: any) {
    return jwt.sign(
        { payload: { ...payload, timestamp: process.hrtime.bigint().toString() } },
        (AUTH_REFRESH_SECRET as Secret),
        { expiresIn: AUTH_REFRESH_EXPIRE }
    );

}

export async function saveRefreshToken (token : string, userId : string) {
    try {
        const savedRefreshToken = await RefreshToken.create({
            user: userId,
            token: await hashString(token),
            expires: new Date((Date.now() / 1000 + toSeconds(AUTH_REFRESH_EXPIRE!)!) * 1000)
        });

        return true;
    } catch (error : any) {
        console.error(error);
        throw error;
    }
}

/**
 * Returns a new access token / refresh token pair if the refresh token hasn't expired and both tokens
 * have valid signatures. Caches refresh token for 2 * JWT expiration time. Idempotent for access token / refresh token
 * pair for 60 seconds. Does NOT validate the user claimed in the tokens.
 * @param accessToken 
 * @param refreshToken 
 * @returns 
 */
export async function refreshTokens(accessToken: string, refreshToken: string, requestUser : string): Promise<{ accessToken: string; refreshToken: string; } | undefined> {
    // creates key to implement lock preventing multiple / concurrent requests
    const key = digest(accessToken + "::" + refreshToken);
    if (lockCache.get(key)) {
        throw new Error("Couldn't acquire lock");
    }
    // sets lock
    lockCache.set(key, 'lock', 60);
    try {
        // verify signature and expiration on refresh token
        const decodedRefresh = jwt.verify(refreshToken, AUTH_REFRESH_SECRET as Secret);
        // verify signature on access token
        const decodedAccess = jwt.verify(accessToken, AUTH_JWT_SECRET as Secret, { ignoreExpiration: true });
        // check idempotency redis cache for stored token pair
        
        // check redis cache for stored refresh token
        const cachedToken = refreshTokenCache.get(`refresh:${(decodedAccess as JwtPayload).payload}`);
        let storedToken = cachedToken ? JSON.parse(cachedToken as string) : null;

        // if not found, check db for refresh token
        if (!storedToken) storedToken = await validateTokenAgainstDatabase(refreshToken, requestUser);

        // if both not found, or token is revoked throw error
        if (!storedToken || storedToken.revoked) throw new Error("Invalid refresh token");

        // create and sign new refresh token and accesstoken
        const newAccessToken = createJwt((decodedAccess as JwtPayload).payload, AUTH_JWT_SECRET, AUTH_JWT_EXPIRE);
        const newRefreshToken = createRefreshToken((decodedRefresh as JwtPayload).payload);

        // save pair in redis idempotency cache
        idempotencyCache.set(`idempotency:${key}`, JSON.stringify({ accessToken: newAccessToken, refreshToken: newRefreshToken }), 60 );

        // save refresh token in redis refresh token cache
        refreshTokenCache.set(`refresh:${(decodedAccess as JwtPayload).payload}`, JSON.stringify({ token: storedToken.token, revoked: false }),  toSeconds(AUTH_JWT_EXPIRE!)! * 2 );

        // update refresh token in db with new refresh token value
        await RefreshToken.findOneAndUpdate({ user: requestUser, revoked: false }, { token: await hashString(newRefreshToken), expires: new Date(parseJwt(newRefreshToken).exp * 1000) });

        // return pair
        return { accessToken: newAccessToken, refreshToken: newRefreshToken };

    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        lockCache.del(key);
    }
}

/**
 * Returns the user _id (as string) from access token
 */
export function getUserFromToken(token: string) {
    try {
        const decoded = jwt.decode(token) as JwtPayload;
        return decoded.payload;
    } catch (error) {
        return null;
    }
}

export async function validateTokenAgainstDatabase (refreshToken : string, user : string): Promise<IRefreshTokenDocument | null> {
    try {

        let isValid : boolean = false;
        let storedToken : IRefreshTokenDocument | null = null;

        // searches based on user, expiration, and revokation status to narrow down search
        // on off chance multiple tokens are active, use find and then iterate through for comparison
        const activeTokens = await RefreshToken.find({ user, expires: { $gt: Date.now() }, revoked: false });

        // if no active tokens, return null
        if (activeTokens.length === 0) return null;

        // iterate through and compare hashed tokens to received refresh token
        for (const token of activeTokens) {
            isValid  = await compareHash(refreshToken, token.token);
            if (isValid) {
                // if found, assign and break early
                storedToken = token;
                break;
            }
        }

        return storedToken;
        
    } catch (error) {
        throw new Error('Failed to validate token against the database');
    }
}