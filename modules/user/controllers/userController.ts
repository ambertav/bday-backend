import { Request, Response } from "express";
import { IChangePasswordRequest, IExtReq, ILoginRequest, ISignupRequest } from "../../../interfaces/auth";
import User, { IUserDocument } from "../models/user";
import VerificationToken from "../models/verificationToken";
import userProfile from "../../profile/models/userProfile";
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import { HTTPError, handleError, sendError } from "../../../utilities/utils";
import * as signupService from '../services/signupService';
import * as verificationService from '../services/verificationService';
import * as tokenService from '../services/tokenService';
import { IRefreshTokenDocument } from "../models/refreshToken";

const { AUTH_JWT_SECRET, AUTH_JWT_EXPIRE, AUTH_REFRESH_SECRET, CONFIRM_DELETE_EXPIRE, EMAIL_SECRET } = process.env;

export async function mobileLogin(req : Request, res : Response) {
    try {
        let { email, password } : ILoginRequest = req.body;
        const { accessToken, refreshToken } = await loginLocal(email.toLowerCase(), password);

        // sends both tokens
        return res.status(200).json({ accessToken, refreshToken });

    } catch (error : any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}

export async function webLogin(req : Request, res : Response) {
    try {
        let { email, password } : ILoginRequest = req.body;
        const { accessToken, refreshToken } = await loginLocal(email.toLowerCase(), password);

        // sends refreshToken as httpOnly cookie
        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: 'localhost',
            path: '/'
        });

        // sends accessToken
        return res.status(200).json({ accessToken });

    } catch (error : any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}

export async function loginLocal(email : string, password : string) {
    try {
        // finds user
        const user: IUserDocument | null = await User.findOne({ email });
        // enforces email verification
        if (user && user.verified === false) throw { status: 403, message: 'Must verify email' }

        // verifies password input 
        if (user && await user.checkPassword(password)) {
            // creates tokens
            const accessToken = tokenService.createJwt(user._id, AUTH_JWT_SECRET, AUTH_JWT_EXPIRE);
            const refreshToken = tokenService.createRefreshToken(user._id);

            // create refresh token in db with hashed value
            const savedRefreshToken = await tokenService.saveRefreshToken(refreshToken, user._id);
            if (!savedRefreshToken) throw new Error('Error with saved refresh token');

            return { accessToken, refreshToken };
        }

        // if no user or invalid password verification, throw error
        else throw { status: 401, message: "Invalid credentials" };

    } catch (error: any) {
        throw error;
    }
}

export async function refresh (req : Request, res : Response) {
    try {
        // extract device to handle getting refresh token differently across mobile and web
        const { device } = req.body; 
        let refreshToken : string | undefined = ''; // initialize refresh token

        // if mobile, extract refresh token from request
        if (device === 'mobile') refreshToken = req.get('Refresh')?.split(" ")[1];
        // if web, extract refresh token from cookies
        else if (device === 'web') refreshToken = req.cookies.jwt; 
        // get access token
        const accessToken : string | undefined = req.get('Authorization')?.split(" ")[1];

        // if either token is missing, throw error to notify frontend to request logout
        if (refreshToken === undefined || accessToken === undefined) throw { status: 403, message: 'Missing tokens, user will be logged out' };

        const tokenUser : JwtPayload = jwt.decode(accessToken) as JwtPayload;

        // intialization and type declarations of return object
        let newTokens : { accessToken : string, refreshToken : string } | undefined;
        // retrieve new token pairs
        newTokens = await tokenService.refreshTokens(accessToken, refreshToken, tokenUser.payload);
        // if no pair, throw error
        if (newTokens === undefined) throw { status: 500, message: 'Error occured while refreshing tokens' }

        // if mobile, send both tokens
        if (device === 'mobile') return res.status(200).json({ accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken });

        // else if web, set httpOnly cookie and send accessToken
        else if (device === 'web') {
            res.cookie('jwt', newTokens.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                domain: 'localhost',
                path: '/'
            });
    
            return res.status(200).json({ accessToken: newTokens.accessToken });
        }

    } catch (error : any) {
        console.error(error);
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: error.message });
        }
    }
}

export async function logout (req : Request & IExtReq, res : Response) {
    let refreshToken : string | undefined = ''; // initialize refresh token

    // extract refresh token from mobile
    if (req.get('Refresh')) refreshToken = req.get('Refresh')?.split(" ")[1];

    // extract refresh token from web
    else refreshToken = req.cookies.jwt;
    
    if (!refreshToken) return res.sendStatus(204); // if no token return

    // search for token in db
    let tokenToBlacklist : IRefreshTokenDocument | null = await tokenService.validateTokenAgainstDatabase(refreshToken, req.user!);

    // if found in database, set revoke to true
    if (tokenToBlacklist) await tokenToBlacklist?.revoke();

    // clear the cookie
    res.clearCookie('jwt', {  httpOnly: true, secure: true, sameSite: 'none' });

    return res.status(200).json({ message: 'Cookie cleared' });
}


export async function updatePassword(req: Request & IExtReq, res: Response) {
    const { oldPassword, newPassword }: IChangePasswordRequest = req.body;
    const user = req.user;

    try {
        if (!user || !oldPassword || !newPassword) {
            throw { status: 400, message: "Missing parameters" };
        }

        const foundUser = await User.findById(user);
        if (!foundUser) {
            throw { status: 404, message: "User not found" };
        }

        if (!(await foundUser.checkPassword(oldPassword))) {
            throw { status: 401, message: "Invalid old password" };
        }

        foundUser.passwordHash = newPassword;

        try {
            await foundUser.save();
        } catch (err: any) {
            throw { status: 400, message: `Save failed: ${err.message}` };
        }

        return res.status(200).json({ message: "Password changed" });

    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function deleteUser(req: Request & IExtReq, res: Response) {
    try {
        const user = await User.findById(req.user);
        if (!user) throw { status: 404, message: "User not found" };
        const confirmationToken = tokenService.createJwt(user._id, AUTH_JWT_SECRET, CONFIRM_DELETE_EXPIRE);
        return res.status(200).json({ confirmationToken });
    } catch (error: any) {
        console.error(error);
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function confirmDeleteUser(req: Request & IExtReq, res: Response) {
    try {
        const { confirmationToken } = req.body;
        if (!confirmationToken) throw { status: 400, message: "No confirmation token provided" };

        let decoded: any;
        try {
            decoded = jwt.verify(confirmationToken, AUTH_JWT_SECRET as Secret);
        } catch (e) {
            throw { status: 400, message: "Invalid or expired confirmation token" };
        }
        if (!req.user || req.user !== decoded.payload) throw { status: 403, message: "Forbidden" };
        const user = await User.findById(decoded.payload);
        if (!user) throw { status: 404, message: "User not found" };

        await user.deleteOne();
        // TODO: Clean other records belonging to user, such as friends, profile, etc.
        await userProfile.deleteMany({ user: user._id });

        return res.status(200).json({ message: "User deleted" });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function signup(req: Request, res: Response) {
    try {
        const data: ISignupRequest = req.body;
        data.email = data.email.toLowerCase(); // formats email to lowercase

        // check for existing user
        const existingUser = await User.findOne({ email: data.email });
        if (existingUser) throw { status: 400, message: "Email already in use" };

        // creates user and corresponding profile
        const id = await signupService.signup(data); 
        if (!id) throw { status: 400, message: "User not created" };

        // sends verification email... if no messageId, throw error
        const result = await verificationService.sendEmailVerification(id.toString());
        if (!result) throw { status: 400, message: 'Failed to send verification email' }

        return res.status(201).json({ message: 'User successfully created and verification email sent sucessfully' });
    } catch (error: any) {
        handleError(res, error);
    }
}

export async function verifyEmail (req : Request, res : Response) {
    try {
        // retrieve email token
        const emailToken = decodeURIComponent(req.body.token);
        if (!emailToken) throw { status: 400, message: 'No email token' }

        // cross reference token with saved valid tokens, returns error if not found
        const validToken = await verificationService.validateTokenAgainstDatabase(emailToken);

        // await user verificiation and return success message 
        const message = await verificationService.verifyUserEmail(emailToken);

        if (message === 'User\'s email was verified successfully') {
            // if success, delete valid token to prevent multiple use
            await VerificationToken.findByIdAndDelete(validToken!._id);
            return res.status(200).json({ message });
        }

    } catch (error : any) {
        if (error instanceof jwt.TokenExpiredError) return res.status(401).json({ message: 'Token expired. Please try again' });
        handleError(res, error);
    }
}

export async function resendVerifyEmail (req : Request, res : Response) {
    try {
        // accepts email or token for reusability
        // will use either method to retreive user id for verification service
        const emailToken = decodeURIComponent(req.body.token);
        const email = req.body.email;

        let id : string = '';

        if (!emailToken && email) { // if email,
            const user = await User.findOne({ email }); // find user
            id = user?._id.toString(); // assign id
        } else if (!email && emailToken) { // if emailToken,
            // decode to get userId
            const decoded = jwt.verify(emailToken.toString(), EMAIL_SECRET!) as JwtPayload;
            id = decoded?.payload; // assign id
        }
        else throw { status: 404, message: 'Invalid input. Please try again' } // if neither, throw error

        // sends verification email using userId... if no messageId, throw error
        const result = await verificationService.sendEmailVerification(id);
        if (!result) throw { status: 400, message: 'Failed to send verification email' };

        return res.status(200).json({ message: 'Email resent successfully' });
    } catch (error : any) {
        handleError(res, error);
    }
}

export async function emailForgotPassword (req : Request, res : Response) {
    try {
        const { email } = req.body;
        if (!email) throw { status: 400, message: 'Must provide an email' };

        const user = await User.findOne({ email });
        if (!user) throw  {status: 404, message: 'User not found' };

        // awaits for confirmation of presence of messageId
        const result = await verificationService.sendForgotPasswordEmail(user._id, user.email);

        // if no messageId, throw error
        if (!result) throw { status: 400, message: 'Failed to send password reset email' }
        return res.status(200).json({ message: 'Password reset email sent successfully' });

    } catch (error : any) {
        handleError(res, error);
    }
}

export async function resetPassword  (req : Request, res : Response) {
    try {
        // destructure and decode vars
        const { newPassword, confirmNewPassword } = req.body;
        const emailToken = decodeURIComponent(req.body.token);
        if (!newPassword || !confirmNewPassword || !emailToken) throw { status: 400, message: 'Must provide a valid token and password' };

        // double check validity of input
        if (newPassword !== confirmNewPassword) throw { status: 400, message: 'Passwords must match' };

        // cross reference token with saved valid tokens, returns error if not found
        const validToken = await verificationService.validateTokenAgainstDatabase(emailToken);

        // decode token
        const decoded = jwt.verify(emailToken.toString(), EMAIL_SECRET!) as JwtPayload;

        // lookup user
        const user = await User.findById(decoded.payload);
        if (!user) throw { status: 404, message: 'User not found' };

        try { // update password
            user.passwordHash = newPassword;
            user.save();

        } catch (err : any) {
            throw { status: 500, message: 'Failed to reset new password' };
        }

        // delete validToken to prevent multiple use
        await VerificationToken.findByIdAndDelete(validToken!._id);

        // return success
        return res.status(200).json({ message: 'User\'s password reset successfully' });

    } catch (error : any) {
        handleError(res, error);
    }
}