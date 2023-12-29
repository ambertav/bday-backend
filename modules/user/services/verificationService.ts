import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/user';
import VerificationToken, { IVerificationTokenDocument } from "../models/verificationToken";
import { hashString, compareHash } from '../../../utilities/cryptoService';
import { toSeconds } from '../../../utilities/utils';
import { createJwt } from "./tokenService";
import { SendMailOptions } from 'nodemailer';
import { sendMail } from "../../../utilities/emailService";
import { FRONTEND_BASE_URL } from '../../../utilities/constants';


const { EMAIL_SECRET, EMAIL_USER, EMAIL_JWT_EXPIRE, EMAIL_FORGOT_EXPIRE } = process.env;

export async function sendEmailVerification (id : string) {
    try {
        // finds user with id returned from signup service
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');

        // creates token for verification
        const emailToken = createJwt(user._id, // for user identification
            EMAIL_SECRET, 
            EMAIL_JWT_EXPIRE,
        );

        const validToken = await VerificationToken.create({
            user: user._id,
            token: await hashString(emailToken),
            expiresAt: new Date((Date.now() / 1000 + toSeconds(EMAIL_JWT_EXPIRE!)!) * 1000)
        });

        // frontend url
        const url = `${FRONTEND_BASE_URL}/verify-email?et=${encodeURIComponent(emailToken)}`;

        const mailOptions : SendMailOptions = { // email info
            from: `Presently 🎁 <${EMAIL_USER}>`,
            to: user.email,
            subject: 'Presently Email Confirmation',
            html: `Please click on this link to verify your email address: <a href="${url}">${url}</a>`
        }

        const result = await sendMail(mailOptions); // sends mail

        // if result.messageId, then successfully send email
        return result.messageId || null;

    } catch (error : any) {
        console.error(error);
        throw error;
    }
}

export async function verifyUserEmail (emailToken : string) {
    try {
        const decode = await jwt.verify(emailToken.toString(), EMAIL_SECRET!) as JwtPayload;

        // find user
        const user = await User.findById(decode.payload);
        if (!user) throw new Error('User not found');

        // update user and save changes
        user.verified = true;
        await user.save();

        // return success message
        return 'User\'s email was verified successfully';

    } catch (error : any) {
        console.error(error);
        throw error;
    }
}

export async function sendForgotPasswordEmail (id : string, email : string) {
    try {
        const emailToken = createJwt(id, // for user identification 
            EMAIL_SECRET, 
            EMAIL_FORGOT_EXPIRE,
        );

        const validToken = await VerificationToken.create({
            user: id,
            token: await hashString(emailToken),
            expiresAt: new Date((Date.now() / 1000 + toSeconds(EMAIL_FORGOT_EXPIRE!)!) * 1000)
        });

        // frontend url
        const url = `${FRONTEND_BASE_URL}/reset-password?et=${encodeURIComponent(emailToken)}`;

        const mailOptions : SendMailOptions = { // email info
            from: `Presently 🎁 <${EMAIL_USER}>`,
            to: email,
            subject: 'Reset Password',
            html: `Please click on this link to reset your password: <a href="${url}">${url}</a>`
        }
        
        const result = await sendMail(mailOptions); // sends mail
        
        // if result.messageId, then successfully send email
        return result.messageId || null;

    } catch (error : any) {
        console.error(error);
        throw error;
    }
}

export async function validateTokenAgainstDatabase (emailToken: string): Promise<IVerificationTokenDocument | null> {
    try {
        const allTokens = await VerificationToken.find();
        const validToken = await Promise.all(allTokens.map(async (token) => {
            const isValid = await compareHash(emailToken, token.token);
            return isValid ? token : null;
        })).then(tokens => tokens.find(token => token !== null));

        if (!validToken || validToken.expiresAt.getTime() < Date.now()) {
            throw new Error('Token is invalid or expired');
        }
    
        return validToken;
    } catch (error) {
        throw new Error('Failed to validate token against the database');
    }
}
