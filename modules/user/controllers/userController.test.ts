import mongoose from "mongoose";
import request from 'supertest';
import nodemailer from 'nodemailer';
import User from "../models/user";
import { configureApp } from '../../../index';
import bearer from "../../../middleware/bearer";
import { toSeconds } from "../../../utilities/utils";
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
let sentMailData : string;
let temporaryEmail : string;

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Friend.deleteMany({});
    await UserProfile.deleteMany({});
    await User.deleteMany({});
    await VerificationToken.deleteMany({});
    await RefreshToken.deleteMany({});

    // api call for temp email
    // async function generateTemporaryEmail () {
    //     try {
    //         const response : any = await fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address&ip=127.0.0.1&agent=Mozilla_foo_bar', {
    //             method: 'GET'
    //         });
    //         if (response) return response.email_addr;

    //     } catch (error) {
    //         console.error('Error generating temporary email: ', error);
    //         throw error;
    //     }
    // }

    // temporaryEmail = await generateTemporaryEmail();

    temporaryEmail = 'naneli4286@laymro.com' // manually add temp for now
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('protected routes', () => {
    it('should require login for protected routes', async () => {
        await request(app)
            //@ts-ignore
            .put('/api/users/')
            .send({ name: "should not change" })
            .expect(401);
    });
});

describe('POST /api/users/', () => {
    // Test user sign-up
    it('should create a new user and associated user profile', async () => {

        jest.mock('nodemailer', () => ({
            createTransport: jest.fn().mockReturnValue({
                sendMail: jest.fn((data) => {
                    // capture the info being sent
                    sentMailData = data;
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

        // ensure corresponding profile was created
        const profile = await UserProfile.findById(user?._id);
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
    
    // Test user login
    it('should login a user', async () => {

        // manually verify email
        const user = await User.findOne({ email: temporaryEmail });
        user!.verified = true;
        await user?.save();

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
    });
});


// describe('POST /api/users/verify-email/', () => {

// });

// describe('POST /api/users/resend-email/', () => {

// });

// describe('POST /api/users/refresh/', () => {

// });

// describe('GET /api/users/logout/', () => {

// });

// describe('PUT /api/users/password/', () => {
//     // Test updating password
//     it('should update user password', async () => {
//         const res = await request(app)
//             //@ts-ignore
//             .put('/api/users/password')
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 oldPassword: "123456Aa!",
//                 newPassword: "987654Bb!"
//             })
//             .expect(200);

//     });
// });

// describe('PUT /api/users/', () => {
//     // Test updating user details
//     it('should update user details', async () => {
//         const res = await request(app)
//             //@ts-ignore
//             .put('/api/users/')
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 name: "new name"
//             })
//             .expect(200);
//         const user = await User.findOne({});
//         expect(user?.name).toEqual("new name");
//     });
// });

// describe('DELETE /api/users/', () => {

//     // Test user deletion
//     it('should delete a user', async () => {
//         const res = await request(app)
//             //@ts-ignore
//             .delete('/api/users/')
//             .set('Authorization', `Bearer ${token}`)
//             .expect(200);
//         const confirmationToken = res.body.confirmationToken;
//         const deleteRes = await request(app)
//             // @ts-ignore
//             .post("/api/users/confirm-delete")
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 confirmationToken
//             })
//             .expect(200);
//         const users = await User.find({});
//         expect(users.length).toEqual(0);
//     });

//     it("should delete associated user profiles on user deletion", async () => {
//         const res = await request(app)
//             //@ts-ignore
//             .post('/api/users')
//             .send({
//                 email: "test@email.com",
//                 password: "123456Aa!",
//                 name: "first",
//                 dob: "1990-01-01",
//                 gender: "male",
//             })
//             .expect(201);
//         token = res.body.accessToken;
//         // assert that user profile was created successfully
//         let profiles = await UserProfile.find({});
//         expect(profiles.length).toBeGreaterThan(0);
//         // delete user
//         const deleteRes = await request(app)
//             //@ts-ignore
//             .delete('/api/users/')
//             .set('Authorization', `Bearer ${token}`)
//             .expect(200);
//         const confirmationToken = deleteRes.body.confirmationToken;
//         await request(app)
//             // @ts-ignore
//             .post("/api/users/confirm-delete")
//             .set('Authorization', `Bearer ${token}`)
//             .send({
//                 confirmationToken
//             })
//             .expect(200);
//         // assert user was deleted
//         const users = await User.find({});
//         expect(users.length).toEqual(0);
//         // assert user profile was also deleted
//         profiles = await UserProfile.find({});
//         expect(profiles.length).toEqual(0);
//     });
// });

// describe('POST /api/users/forgot-password', () => {

// });

// describe('POST /api/users/reset-password', () => {

// });






//     // Test confirmation token expiration -- Long Running test + need to modify .env to work.
//     // it("should not delete user if confirmation token expired", async () => {
//     //     const res = await request(app)
//     //         //@ts-ignore
//     //         .post('/api/users')
//     //         .send({
//     //             email: "test@email.com",
//     //             password: "123456Aa!",
//     //             firstName: "first",
//     //             lastName: "last"
//     //         })
//     //         .expect(201);
//     //     token = res.body.accessToken;

//     //     const deleteRes = await request(app)
//     //         //@ts-ignore
//     //         .delete('/api/users/')
//     //         .set('Authorization', `Bearer ${token}`)
//     //         .expect(200);
//     //     const confirmationToken = deleteRes.body.confirmationToken;

//     //     // set expiry to < 3 seconds in the .env for this test
//     //     await new Promise(res => setTimeout(res, 3000));
//     //     // Attempt to confirm deletion with expired token
//     //     await request(app)
//     //         //@ts-ignore
//     //         .post("/api/users/confirm-delete")
//     //         .set('Authorization', `Bearer ${token}`)
//     //         .send({
//     //             confirmationToken
//     //         })
//     //         .expect(400);

//     //     // Validate that the user still exists
//     //     const users = await User.find({});
//     //     expect(users.length).toEqual(1);
//     // }, 10000);

//     // Test protected routes