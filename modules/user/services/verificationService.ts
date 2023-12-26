import { createJwt } from "./tokenService";
import { sendMail } from "../../../utilities/emailService";
import { SendMailOptions } from 'nodemailer';
import User from '../models/user';


const { EMAIL_SECRET, EMAIL_USER } = process.env;

export async function sendEmailVerification (id : string) {
    try {
        // finds user with id returned from signup service
        const user = await User.findById(id);
        if (!user) throw new Error('User not found');

        // creates token for verification
        const emailToken = createJwt(user._id, EMAIL_SECRET, '1d');

        // frontend url
        const url = `http://localhost:3000/verify-email/${emailToken}`;

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