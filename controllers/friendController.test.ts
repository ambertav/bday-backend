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

describe('POST /api/friends/create', () => {
    it('should create a new friend', async () => {
        
        const userResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        })
        
        token = userResponse.body.accessToken;
        const user = (jwt.decode(token) as JwtPayload)

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