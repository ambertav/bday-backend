import mongoose from "mongoose";
import request from 'supertest';
import User from "../models/user";
import { configureApp } from '../../../index';
import bearer from "../../../middleware/bearer";
import UserProfile from "../../profile/models/userProfile";
import Friend from "../../friends/models/friend";
import VerificationToken from "../models/verificationToken";
import RefreshToken from '../models/refreshToken';


const app = configureApp([bearer]);

declare global {
    var __MONGO_URI__: string;
}

// Test variables
let token : string;
let userId : string;
let refreshToken : string;
let verifyMailData : string;
let resetPasswordMailData : string;
let temporaryEmail : string;

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Friend.deleteMany({});
    await UserProfile.deleteMany({});
    await User.deleteMany({});
    await VerificationToken.deleteMany({});
    await RefreshToken.deleteMany({});

    temporaryEmail = '' // manually add temp for now
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('protected routes', () => {
    it('should require login for protected routes', async () => {
        await request(app)
            //@ts-ignore
            .put('/api/users/password')
            .send({ 
                oldPassword: "123456Aa!",
                newPassword: "987654Bb!" 
            })
            .expect(401);
    });
});

describe('POST /api/users/', () => {
    // Test user sign-up
    it('should create a new user and associated user profile', async () => {

        jest.mock('nodemailer', () => ({
            createTransport: jest.fn().mockReturnValue({
                sendMail: jest.fn((data) => {
                    // to capture the info being sent
                    verifyMailData = data;
                })
            })
        }));

        const response = await request(app)
            //@ts-ignore
            .post('/api/users/')
            .send({
                email: temporaryEmail,
                password: "123456Aa!",
                name: "test",
                dob: "1990-01-01",
                gender: "male",
            })
            .expect(201);

        // ensure user was created
        const user = await User.findOne({ email: temporaryEmail });
        expect(user).toBeDefined();
        userId = user?._id;

        // ensure corresponding profile was created
        const profile = await UserProfile.findOne({ user: userId });
        expect(profile).toBeDefined();
        
        expect(response.body.message).toBe('User successfully created and verification email sent sucessfully');
    });

    it('should send out a verification email', async () => {
        // ensure that verification token was created
        const user = await User.findOne({ email: temporaryEmail });
        const token = await VerificationToken.findOne({ user: user?._id });
        expect(token).toBeDefined();
    });
});

describe('POST /api/users/login/', () => {
    it('should reject login of an user with an unverified email', async () => {

        // valid user with unverified email, expect 403
        const response = await request(app)
        //@ts-ignore
            .post('/api/users/login')
            .send({
                email: temporaryEmail,
                password: "123456Aa!",
            })
            .expect(403);
    
        expect(response.body.message).toEqual('Must verify email');
    });
    
    it('should reject login of an user with invalid password', async () => {

        // invalid user, expect 401
        const response = await request(app)
        //@ts-ignore
        .post('/api/users/login')
        .send({
            email: "invalid@email.com",
            password: "invalid",
        })
        .expect(401);
    
        expect(response.body.message).toEqual('Invalid credentials');
    });
    
    it('should login a user', async () => {

        // manually verify email
        const user = await User.findOne({ email: temporaryEmail });
        user!.verified = true;
        await user!.save();

        // expect 200 OK on login
        const response = await request(app)
            //@ts-ignore
            .post('/api/users/login')
            .send({
                email: temporaryEmail,
                password: "123456Aa!",
            })
            .expect(200);

        // ensure that accessToken is sent in response
        expect(response.body.accessToken).toBeDefined();
        token = response.body.accessToken;

        // ensure that cookie is being set and is http-only
        const setCookieHeader = response.headers['set-cookie'];
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader).toHaveLength(1); 
        expect(setCookieHeader[0]).toMatch(/HttpOnly/i);

        // extract the refreshToken for future use
        const regexMatches = setCookieHeader[0].match(/jwt=([^;]+)/);
        refreshToken = regexMatches[1];
    });
});

describe('POST /api/users/verify-email/', () => {
    it('should verify the user\'s email', async () => {

        // reset manually verification, and ensure that it is false
        const user = await User.findOne({ email: temporaryEmail });
        user!.verified = false;
        await user!.save();

        expect(user?.verified).toEqual(false);

        // get email token from email manually for now
        const emailToken : string = encodeURIComponent('');

        const response = await request(app)
            //@ts-ignore
            .post('/api/users/verify-email')
            .send({ token: emailToken })
            .expect(200);
   
        // ensuring that verification worked
        expect(response.body.message).toBe('User\'s email was verified successfully');
        const verifiedUser = await User.findById(user!._id);
        expect(verifiedUser?.verified).toEqual(true);
    });
});

describe('POST /api/users/refresh/', () => {
    it('should send over a new accessToken and refresh token', async () => {

        // expect 200 OK, send over both tokens
        const response = await request(app)
            .post('/api/users/refresh')
            .send({ device: 'web' })
            .set('Authorization', `Bearer ${token}`)
            .set('Cookie', `jwt=${refreshToken}`)
            .expect(200);

        // ensuring new accessToken was sent in body
        expect(response.body.accessToken).toBeDefined();
        token = response.body.accessToken;

        // and refreshToken was set to cookies, httpOnly
        const setCookieHeader = response.headers['set-cookie'];
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader).toHaveLength(1); 
        expect(setCookieHeader[0]).toMatch(/HttpOnly/i); 

        // extract the new refreshToken for future use
        const regexMatches = setCookieHeader[0].match(/jwt=([^;]+)/);
        refreshToken = regexMatches[1];
    })
});

describe('PUT /api/users/password/', () => {
    it('should update user password', async () => {
        const res = await request(app)
            //@ts-ignore
            .put('/api/users/password')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldPassword: "123456Aa!",
                newPassword: "987654Bb!"
            })
            .expect(200);
    });
});

describe('POST /api/users/forgot-password', () => {
    it('should email a forgot password link', async () => {

        jest.mock('nodemailer', () => ({
            createTransport: jest.fn().mockReturnValue({
                sendMail: jest.fn((data) => {
                    // to capture the info being sent
                    resetPasswordMailData = data;
                })
            })
        }));

        const response = await request(app)
            .post('/api/users/forgot-password')
            .send({ email: temporaryEmail })
            .expect(200);

        expect(response.body.message).toBe('Password reset email sent successfully');

    })
});

describe('POST /api/users/reset-password', () => {
    it('should reset the user\'s password', async () => {

        // get email token from email manually for now
        const resetToken : string = encodeURIComponent('');
        
        const response = await request(app)
            .post('/api/users/reset-password')
            .send({
                newPassword: '123456Aa!',
                confirmNewPassword: '123456Aa!',
                token: resetToken
            })
            .expect(200);
    });
});

describe('GET /api/users/logout/', () => {
    it('should log the user out and remove the refresh token cookie', async () => {
        const response = await request(app)
            .get('/api/users/logout')
            .set('Cookie', `jwt=${refreshToken}`)
            .expect(200);

        // ensuring that setCookieHeader has empty jwt token, aka refresh token cookie was cleared
        const setCookieHeader = response.headers['set-cookie'];
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader[0]).toMatch(/jwt=\s*;/i);
    });
});

describe('DELETE /api/users/', () => {
    it('should delete a user and associated profile', async () => {
        // request to get confirmation token
        const res = await request(app)
            .delete('/api/users/')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const confirmationToken = res.body.confirmationToken;

        // run request for confirm deletion
        const deleteRes = await request(app)
            // @ts-ignore
            .post("/api/users/confirm-delete")
            .set('Authorization', `Bearer ${token}`)
            .send({ confirmationToken })
            .expect(200);

        // ensure that user was deleted
        const user = await User.findById(userId);
        expect(user).toBeNull();

        // ensure corresponding profile was deleted
        const profile = await UserProfile.findOne({ user: userId });
        expect(profile).toBeNull();
    });
});


    // Test confirmation token expiration -- Long Running test + need to modify .env to work.
    // it("should not delete user if confirmation token expired", async () => {
    //     const res = await request(app)
    //         //@ts-ignore
    //         .post('/api/users')
    //         .send({
    //             email: "test@email.com",
    //             password: "123456Aa!",
    //             firstName: "first",
    //             lastName: "last"
    //         })
    //         .expect(201);
    //     token = res.body.accessToken;

    //     const deleteRes = await request(app)
    //         //@ts-ignore
    //         .delete('/api/users/')
    //         .set('Authorization', `Bearer ${token}`)
    //         .expect(200);
    //     const confirmationToken = deleteRes.body.confirmationToken;

    //     // set expiry to < 3 seconds in the .env for this test
    //     await new Promise(res => setTimeout(res, 3000));
    //     // Attempt to confirm deletion with expired token
    //     await request(app)
    //         //@ts-ignore
    //         .post("/api/users/confirm-delete")
    //         .set('Authorization', `Bearer ${token}`)
    //         .send({
    //             confirmationToken
    //         })
    //         .expect(400);

    //     // Validate that the user still exists
    //     const users = await User.find({});
    //     expect(users.length).toEqual(1);
    // }, 10000);

    // Test protected routes