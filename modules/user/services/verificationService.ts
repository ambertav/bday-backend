import jwt, { JwtPayload } from 'jsonwebtoken';
import { createJwt } from "./tokenService";
import { SendMailOptions } from 'nodemailer';
import { sendMail } from "../../../utilities/emailService";
import { FRONTEND_BASE_URL } from '../../../utilities/constants';
import User from '../models/user';


const { EMAIL_SECRET, EMAIL_USER, EMAIL_JWT_EXPIRE } = process.env;

export async function sendEmailVerification (id : string) {
    try {
        // finds user with id returned from signup service
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');

        // creates token for verification
        const emailToken = createJwt(
            { 
                sub: user._id, // for user identification
                verified: user.verified, // 
                updatedAt: user.updatedAt!.getTime() // to ensure single use by checking if token updatedAt value matches database 
            }, 
            EMAIL_SECRET, 
            EMAIL_JWT_EXPIRE,
        );

        // frontend url
        const url = `${FRONTEND_BASE_URL}/verify-email?et=${emailToken}`;

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

export async function verifyUserEmail (decodedToken : JwtPayload) {
    try {
        // find user
        console.log(decodedToken);
        const user = await User.findById(decodedToken.payload.sub);
        if (!user) throw new Error('User not found');

        // if user was updated between time of token creation and token utilization, abort and have to generate new token
        if (user.updatedAt!.getTime() !== decodedToken.payload.updatedAt) throw new Error('This token is invalid. Please try again');

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