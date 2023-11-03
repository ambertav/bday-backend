import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { IExtReq } from "../interfaces/auth";
import * as tokenService from '../modules/user/services/tokenService';
import { TokenExpiredError } from 'jsonwebtoken';
import { handleError } from "../utilities/utils";

const { AUTH_JWT_SECRET, AUTH_REFRESH_SECRET } = process.env;

export default async (req: Request & IExtReq, res: Response, next: NextFunction) => {
    let token = req.get("Authorization");
    req.user = null;
    if (token) {
        token = token.split(" ")[1];
        try {
            const decoded = jwt.verify(token, AUTH_JWT_SECRET!);
            req.user = (decoded as JwtPayload).payload;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                // Check for a refreshToken in signed cookies
                const refreshToken = req.signedCookies?.refreshToken;
                if (refreshToken) {
                    try {
                        // Verify the refresh token
                        jwt.verify(refreshToken, AUTH_REFRESH_SECRET!);
                        // Refresh tokens if verification is successful
                        const tokens = await tokenService.refreshTokens(token, refreshToken);
                        // Set the new refresh token in an http-only cookie
                        res.cookie('refreshToken', tokens?.refreshToken, {
                            httpOnly: true,
                            signed: true,
                            sameSite: 'none',
                            secure: true
                        });
                        // Set the new access token in the 'x-access-token' header
                        res.setHeader('x-access-token', tokens?.accessToken!);
                        // Set CORS allow header for 'x-access-token'
                        res.setHeader('Access-Control-Expose-Headers', 'x-access-token');
                        // Set user
                        req.user = (jwt.decode(tokens?.accessToken!) as JwtPayload).payload
                    } catch (innerError) {
                        //return handleError(res, innerError);
                    }
                } else {
                    console.error("No refresh token");
                }
            } else {
                handleError(res, { status: 401, message: "Invalid token" });
            }
        }
    }
    return next();
};
