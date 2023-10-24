import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../index';
import bearer from '../middleware/bearer';
import jwt, { JwtPayload } from 'jsonwebtoken';

import Friend from "../models/friend";
import User from '../models/user';
const app = configureApp([bearer]);


declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Friend.deleteMany({});
    await User.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.close();
});

let token : string;
let otherToken : string;

describe('POST /api/friends/create', () => {
    it('should create a new friend', async () => {
        
        const userResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        });
        
        token = userResponse.body.accessToken;
        const user = (jwt.decode(token) as JwtPayload);

        const requestBody = {
            firstName: 'test',
            lastName: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            interests: ['testing', 'this is a test'],
            tags: [],
            user: user.payload
        }

        const response = await request(app)
            .post('/api/friends/create')
            .send(requestBody)
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('_id');
    });
});


describe ('GET /api/friends/', () => {
    it('should retrieve all of the user\'s friends', async () => {

        const userResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "testing@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        });
        
        token = userResponse.body.accessToken;
        const user = (jwt.decode(token) as JwtPayload);

        const friendData = {
            firstName: 'test',
            lastName: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            interests: ['testing', 'this is a test'],
            tags: [],
            user: user.payload
        }

        // feeding friend data
        const friend1 = await Friend.create(friendData);
        const friend2 = await Friend.create(friendData);

        const response = await request(app)
            .get('/api/friends/')
            .set('Authorization', `Bearer ${token}`);

        // should return all friends
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveLength(2);

        await Friend.deleteMany({user: user.payload});

        const emptyResponse = await request(app)
        .get('/api/friends/')
        .set('Authorization', `Bearer ${token}`);

        // should return empty object if no friends
        expect(emptyResponse.statusCode).toBe(204);
        expect(emptyResponse.body).toEqual({});
    });
});



describe('DELETE /api/friends/:id/delete', () => {
    it('should delete a user\'s friend only if the friend belongs to user and is found', async () => {
        const userResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "testingtest@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        });
        
        token = userResponse.body.accessToken;
        const user = (jwt.decode(token) as JwtPayload);

        const otherUserResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "testingt@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        });
        
        otherToken = otherUserResponse.body.accessToken;
        const otherUser = (jwt.decode(otherToken) as JwtPayload);

        const friendData = {
            firstName: 'test',
            lastName: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            interests: ['testing', 'this is a test'],
            tags: [],
            user: user.payload
        }

        const friend = await Friend.create(friendData);

        const response = await request(app)
        .delete(`/api/friends/${friend._id}/delete`)
        .set('Authorization', `Bearer ${otherToken}`);

        expect(response.statusCode).toBe(403);

        const response2 = await request(app)
        .delete(`/api/friends/${friend._id}/delete`)
        .set('Authorization', `Bearer ${token}`);

        expect(response2.statusCode).toBe(204);

        const deletedFriend = await Friend.findById(friend._id);
        expect(deletedFriend).toBeNull();

        const response3 = await request(app)
        .delete(`/api/friends/${friend._id}/delete`)
        .set('Authorization', `Bearer ${token}`);

        expect(response3.statusCode).toBe(404);
    });
});