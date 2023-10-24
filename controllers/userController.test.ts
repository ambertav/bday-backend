import mongoose from "mongoose";
import request from 'supertest';
import User from "../models/user";
import * as userCtrl from './userController';
import { configureApp } from '../index';
import bearer from "../middleware/bearer";
import { toSeconds } from "../utilities/utils";
import userProfile from "../models/userProfile";
import friend from "../models/friend";

const app = configureApp([bearer]);

declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await friend.deleteMany({});
    await userProfile.deleteMany({});
    await User.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.close();
});

// Test variables
let token: string;

describe('User Controller', () => {

    // Test user sign-up
    it('should create a new user', async () => {
        const res = await request(app)
            //@ts-ignore
            .post('/api/users/')
            .send({
                email: "test@email.com",
                password: "123456Aa!",
                firstName: "test",
                lastName: "user",
                dob: "1990-01-01",
                gender: "male",
            })
            .expect(201);
    });

    // Test user login
    it('should login a user', async () => {
        const res = await request(app)
            //@ts-ignore
            .post('/api/users/login')
            .send({
                email: "test@email.com",
                password: "123456Aa!",
            })
            .expect(200);
        token = res.body.accessToken;
    });

    // Test updating user details
    it('should update user details', async () => {
        const res = await request(app)
            //@ts-ignore
            .put('/api/users/')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: "new name"
            })
            .expect(200);
        const user = await User.findOne({});
        expect(user?.firstName).toEqual("new name");
    });

    // Test updating password
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

    // Test user deletion
    it('should delete a user', async () => {
        const res = await request(app)
            //@ts-ignore
            .delete('/api/users/')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const confirmationToken = res.body.confirmationToken;
        const deleteRes = await request(app)
            // @ts-ignore
            .post("/api/users/confirm-delete")
            .set('Authorization', `Bearer ${token}`)
            .send({
                confirmationToken
            })
            .expect(200);
        const users = await User.find({});
        expect(users.length).toEqual(0);
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
    it('should require login for protected routes', async () => {
        await request(app)
            //@ts-ignore
            .put('/api/users/')
            .send({
                firstName: "should not change"
            })
            .expect(401);
    });

    it("should delete associated user profiles on user deletion", async () => {
        const res = await request(app)
            //@ts-ignore
            .post('/api/users')
            .send({
                email: "test@email.com",
                password: "123456Aa!",
                firstName: "first",
                lastName: "last",
                dob: "1990-01-01",
                gender: "male",
            })
            .expect(201);
        token = res.body.accessToken;
        // assert that user profile was created successfully
        let profiles = await userProfile.find({});
        expect(profiles.length).toBeGreaterThan(0);
        // delete user
        const deleteRes = await request(app)
            //@ts-ignore
            .delete('/api/users/')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const confirmationToken = deleteRes.body.confirmationToken;
        await request(app)
            // @ts-ignore
            .post("/api/users/confirm-delete")
            .set('Authorization', `Bearer ${token}`)
            .send({
                confirmationToken
            })
            .expect(200);
        // assert user was deleted
        const users = await User.find({});
        expect(users.length).toEqual(0);
        // assert user profile was also deleted
        profiles = await userProfile.find({});
        expect(profiles.length).toEqual(0);
    });
});