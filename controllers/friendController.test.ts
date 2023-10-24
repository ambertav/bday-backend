import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../index';
import bearer from '../middleware/bearer';
import jwt, { JwtPayload } from 'jsonwebtoken';

import Friend from "../models/friend";
import User from '../models/user';
import Tag from '../models/tag';
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

let user: JwtPayload;
let otherUser: JwtPayload;

beforeAll(async () => {
    const userResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        });

    token = userResponse.body.accessToken;
    user = jwt.decode(token) as JwtPayload;

    const otherUserResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "testingt@email.com",
            password: "123456Aa!",
            firstName: "test",
            lastName: "user"
        });

    otherToken = otherUserResponse.body.accessToken;
    otherUser = jwt.decode(otherToken) as JwtPayload;
});

describe('POST /api/friends/create', () => {
    it('should create a new friend', async () => {
    
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
    describe('GET /api/friends/', () => {
        it('should retrieve all of the user\'s friends', async () => {
            const friendData = {
                firstName: 'test',
                lastName: 'test',
                dob: '1997-01-26',
                photo: 'string',
                bio: 'a test user',
                interests: ['testing', 'this is a test'],
                tags: [],
                user: otherUser.payload
            }
    
            // Create test friends
            const friend1 = await Friend.create(friendData);
            const friend2 = await Friend.create(friendData);
    
            const response = await request(app)
                .get('/api/friends/')
                .set('Authorization', `Bearer ${otherToken}`);
    
            // Should return all friends
            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveLength(2);
    
            // Clean up created friends
            await Friend.deleteMany({ user: otherUser.payload });
        });
    
        it('should return an empty response if there are no friends', async () => {
            const emptyResponse = await request(app)
                .get('/api/friends/')
                .set('Authorization', `Bearer ${otherToken}`);
    
            // Should return an empty response if no friends
            expect(emptyResponse.statusCode).toBe(204);
            expect(emptyResponse.body).toEqual({});
        });
    });    
});

describe('GET /api/friends/:id', () => {
    it('should return a single friend associated with the user', async () => {

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

        const friend3 = await Friend.create(requestBody);

        const response = await request(app)
        .get(`/api/friends/${friend3._id}`)
        .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(200);

        // if request is made by another user, the friend is not found
        const response2 = await request(app)
        .get(`/api/friends/${friend3._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

        expect(response2.statusCode).toBe(404);

    });
});

describe('DELETE /api/friends/:id/delete', () => {
    it('should delete a user\'s friend only if the friend belongs to user and is found', async () => {

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


describe('PUT /api/friends/:id/update', () => {
    it('should update a user\'s friend', async () => {
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

        const testTag = await Tag.create({
            type: "custom",
            title: "Test Tag"
        });

        const updateString = {
            ...friendData,
            firstName: 'testing'
        }

        const updateInterests = {
            ...friendData,
            interests: ['just a test']
        }

        const updateTags = {
            ...friendData,
            tags: [testTag._id]
        }

        const friend = await Friend.create(friendData);

        // tests if any string field on the friend object will be updated
        const stringResponse = await request(app)
            .put(`/api/friends/${friend._id}/update`)
            .send(updateString)
            .set('Authorization', `Bearer ${token}`);

        expect(stringResponse.statusCode).toBe(204);

        const updatedFriend = await Friend.findById(friend._id);
        expect(updatedFriend?.firstName).toEqual(updateString.firstName);

        // tests if the interests array field will be updated
        const interestsResponse = await request(app)
            .put(`/api/friends/${friend._id}/update`)
            .send(updateInterests)
            .set('Authorization', `Bearer ${token}`);

        expect(interestsResponse.statusCode).toBe(204);

        const updatedInterestsFriend = await Friend.findById(friend._id);
        expect(updatedInterestsFriend?.interests).toEqual(updateInterests.interests);

        // tests if the tag array of ObjectIds will be updated
        const tagsResponse = await request(app)
            .put(`/api/friends/${friend._id}/update`)
            .send(updateTags)
            .set('Authorization', `Bearer ${token}`);

        expect(tagsResponse.statusCode).toBe(204);

        const updatedTagsFriend = await Friend.findById(friend._id);
        expect(updatedTagsFriend?.tags).toEqual(updateTags.tags);
    });
});
