import { google } from 'googleapis';
import nodemailer, { SendMailOptions } from 'nodemailer';

const { EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REDIRECT_URI, EMAIL_REFRESH_TOKEN, EMAIL_USER } = process.env


export async function sendMail (mailOptions : SendMailOptions) { // configures and uses transporter, accepts email info
    try {
        // oauth2 client for signing into gmail
        const oauth2Client = new google.auth.OAuth2(EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REDIRECT_URI)
        oauth2Client.setCredentials({ refresh_token: EMAIL_REFRESH_TOKEN });
        const accessToken = await oauth2Client.getAccessToken();
    
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                type: 'OAuth2',
                user: EMAIL_USER,
                clientId: EMAIL_CLIENT_ID,
                clientSecret: EMAIL_CLIENT_SECRET,
                refreshToken: EMAIL_REFRESH_TOKEN,
                accessToken: accessToken,
            } as any
        });

        // use transport to send email info
        const result = await transporter.sendMail(mailOptions);

        return result;

    } catch (error : any) {
        console.error('Error sending email: ', error);
        throw error;
    }
}