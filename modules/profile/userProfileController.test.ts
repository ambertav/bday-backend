import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../../index';
import bearer from '../../middleware/bearer';
import jwt, { JwtPayload } from 'jsonwebtoken';

import Friend from '../friends/models/friend';
import User from '../user/models/user';
import UserProfile from './models/userProfile';

const app = configureApp([bearer]);

declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Friend.deleteMany({});
    await User.deleteMany({});
    await UserProfile.deleteMany({});
});

afterAll(async () => {
    try {
        await Friend.deleteMany({});
        await User.deleteMany({});
        await UserProfile.deleteMany({});
    } finally {
        await mongoose.connection.close();
    }
});

let token: string;
let user: JwtPayload;

beforeAll(async () => {

    // sign up user to trigger signup service that creates user and corressponding profile
    await request(app)
        .post('/api/users/')
        .send({
            email: 'test@email.com',
            password: '123456Aa!',
            name: 'test',
            dob: '1997-01-26',
            gender: 'female',
        });

    // find created user and manually verify email to enable login
    await User.findOneAndUpdate({ email: 'test@email.com' }, { $set: { verified: true } });          

    // log in user and save token
    const userResponse = await request(app)
        .post('/api/users/login')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
        });

    token = userResponse.body.accessToken;
    user = jwt.decode(token) as JwtPayload;
});

describe('POST /api/users/profile/upload', () => {
    // // Add a .png on the root of project to run this test
    // it("should upload a photo", async () => {
    //     const res = await request(app)
    //         .post('/api/users/profile/upload')
    //         .set('Authorization', `Bearer ${token}`)
    //         .attach('photo','./testimage.png');

    //     expect(res.status).toBe(200);
    //     expect(res.body.message).toBe('Photo uploaded successfully');


    //     const profileResponse = await request(app)
    //     .get('/api/users/profile')
    //     .set('Authorization', `Bearer ${token}`);

    //     expect(profileResponse.status).toBe(200);

    //     const photoUrl = profileResponse.body.photoUrl;
    //     expect(photoUrl).not.toBeNull();
        
    // },10000);
});

describe('PUT /api/users/profile/', () => {
    it('should update user profile', async () => {
        const response = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ bio: 'Test Bio' })
            .expect(200);
    
        expect(response.body.message).toBe('User profile updated');

        // ensuring that profile was updated with req body input
        expect(response.body.profile.bio).toBe('Test Bio');
    });
});

describe('GET /api/users/profile/', () => {
    it('should return user profile', async () => {
        const profile = await UserProfile.findOne({ user: user.payload });

        const response = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
    
        // ensuring that response has profile, and profile has added daysUntilBirthday fields
        expect(response.body).toHaveProperty('profile');
        expect(response.body.profile).toHaveProperty('daysUntilBirthday');

        // ensuring that returned profile matches queried profile
        expect(response.body.profile._id).toEqual(profile!._id.toString());
    })
});

describe('GET /api/users/profile/all/', () => {
    it('should return user profile and user details', async () => {
        const profile = await UserProfile.findOne({ user: user.payload });

        const response = await request(app)
            .get('/api/users/profile/all')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
    
        // ensuring that response has profile and user details
        expect(response.body).toHaveProperty('profile');
        expect(response.body).toHaveProperty('user');

        // ensuring that returned profile matches queried profile, and has added field of daysUntilBirthday
        expect(response.body.profile).toHaveProperty('daysUntilBirthday');
        expect(response.body.profile._id).toEqual(profile!._id.toString());

        // ensuring that returned user matches payload
        expect(response.body.user._id).toEqual(user.payload);
    });
});