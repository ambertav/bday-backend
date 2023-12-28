import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import { digest } from '../../../utilities/cryptoService';
import RefreshToken from '../models/refreshToken';
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

/**
 * Returns a new access token / refresh token pair if the refresh token hasn't expired and both tokens
 * have valid signatures. Caches refresh token for 2 * JWT expiration time. Idempotent for access token / refresh token
 * pair for 60 seconds. Does NOT validate the user claimed in the tokens.
 * @param accessToken 
 * @param refreshToken 
 * @returns 
 */
export async function refreshTokens(accessToken: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string; } | undefined> {
    const key = digest(accessToken + "::" + refreshToken);
    const storedPair = idempotencyCache.get(`idempotency:${key}`);
        if (storedPair) {
            // if found return parsed pair
            return JSON.parse(storedPair as string);
        }
    if (lockCache.get(key)) {
        throw new Error("Couldn't acquire lock");
    }
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
        // if not found, chceck db for refresh token
        if (!storedToken) {
            storedToken = await RefreshToken.findOne({ token: refreshToken });
        }
        // if both not found, or token is revoked throw error
        if (!storedToken || storedToken.revoked || storedToken.token !== refreshToken) throw new Error("Invalid refresh token");
        // create and sign new refresh token and accesstoken
        const newAccessToken = createJwt((decodedAccess as JwtPayload).payload, AUTH_JWT_SECRET, AUTH_JWT_EXPIRE);
        const newRefreshToken = createRefreshToken((decodedRefresh as JwtPayload).payload);
        // save pair in redis idempotency cache
        idempotencyCache.set(`idempotency:${key}`, JSON.stringify({ accessToken: newAccessToken, refreshToken: newRefreshToken }), 60 );
        // save refresh token in redis refresh token cache
        storedToken.token = newRefreshToken;
        refreshTokenCache.set(`refresh:${(decodedAccess as JwtPayload).payload}`, JSON.stringify(storedToken),  toSeconds(AUTH_JWT_EXPIRE!)! * 2 );
        // save refresh token in db
        await RefreshToken.findOneAndUpdate({ token: refreshToken }, { token: newRefreshToken, expires: new Date(parseJwt(newRefreshToken).exp * 1000) });
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