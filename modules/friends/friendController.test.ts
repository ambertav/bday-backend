import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../../index';
import bearer from '../../middleware/bearer';
import jwt, { JwtPayload } from 'jsonwebtoken';

import Friend from "./models/friend";
import User from '../user/models/user';
import Tag from '../tags/models/tag';
import Reminder from '../notifications/models/reminder';
import GiftRecommendation from '../recommendation/models/giftRecommendation';

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
    try {
        await Friend.deleteMany({});
        await User.deleteMany({});
    } finally {
        await mongoose.connection.close();
    }
});

let token: string;
let otherToken: string;

let user: JwtPayload;
let otherUser: JwtPayload;

beforeAll(async () => {

    // manually create two users and with verified emails
    await User.create({
        email: "test@email.com",
        passwordHash: "123456Aa!",
        verified: true,
    });

    await User.create({
        email: "testing@email.com",
        passwordHash: "123456Aa!",
        verified: true,
    });

    // log each user in and save the corresponding token
    const userResponse = await request(app)
        .post('/api/users/login')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
        });

    token = userResponse.body.accessToken;
    user = jwt.decode(token) as JwtPayload;

    const otherUserResponse = await request(app)
        .post('/api/users/login')
        .send({
            email: "testing@email.com",
            password: "123456Aa!",
        });

    otherToken = otherUserResponse.body.accessToken;
    otherUser = jwt.decode(otherToken) as JwtPayload;
});

describe('POST /api/friends/create', () => {
    it('should create a new friend', async () => {
        const requestBody = {
            name: 'test',
            gender: 'female',
            dob: '1997-01-26',
            photo: 'string',
            tags: [],
            favoriteGifts: [],
            user: user.payload,
        }

        const response = await request(app)
            .post('/api/friends/create')
            .send(requestBody)
            .set('Authorization', `Bearer ${token}`);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.name).toEqual(requestBody.name);
    });
});


describe('GET /api/friends/', () => {
    describe('GET /api/friends/', () => {
        it('should retrieve all of the user\'s friends', async () => {
            const friendData = {
                name: 'test',
                dob: '1997-01-26',
                photo: 'string',
                tags: [],
                favoriteGifts: [],
                user: otherUser.payload,
                gender: 'female'
            }

            // create test friends
            const friend1 = await Friend.create(friendData);
            const friend2 = await Friend.create(friendData);

            const response = await request(app)
                .get('/api/friends/')
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(200);

            // should return in particular strucutre
            expect(response.body).toEqual(expect.objectContaining({
                today: expect.any(Array),
                thisWeek: expect.any(Array),
                thisMonth: expect.any(Array),
                laterOn: expect.any(Array),
            }));

            // flatten strucutre and verify that response returns all friends
            const allFriends = [
                ...response.body.laterOn,
                ...response.body.thisMonth,
                ...response.body.thisWeek,
                ...response.body.today
            ];
            expect(allFriends).toHaveLength(2);

            // clean up created friends
            await Friend.deleteMany({ user: otherUser.payload });
        });

        it('should return an message response if there are no friends', async () => {
            const noFriendsResponse = await request(app)
                .get('/api/friends/')
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(200);

            // Should return an message response if no friends
            expect(noFriendsResponse.body.message).toEqual('No friends found');
        });
    });
});

describe('GET /api/friends/:id', () => {
    it('should return a single friend associated with the user', async () => {

        const requestBody = {
            name: 'test',
            gender: 'female',
            dob: '1997-01-26',
            photo: 'string',
            tags: [],
            favoriteGifts: [],
            user: user.payload,
        }

        const friend3 = await Friend.create(requestBody);

        const response = await request(app)
            .get(`/api/friends/${friend3._id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        // if request is made by another user, the friend is not found
        const response2 = await request(app)
            .get(`/api/friends/${friend3._id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .expect(404);

    });
});

describe('DELETE /api/friends/:id/delete', () => {

    // initalizing variables for ids
    let friendId = '';
    let reminderId = '';
    let giftId = '';

    beforeAll(async () => {
        const friendData = {
            name: 'test',
            gender: 'female',
            dob: '1997-01-26',
            photo: 'string',
            tags: [],
            favoriteGifts: [],
            user: user.payload,
        }
    
        // create friend
        const friend = await Friend.create(friendData);
        friendId = friend._id;
    
        // create reminder associated to friend
        const testReminder = await Reminder.create({
            type: 0,
            user: user.payload,
            friend: friend._id
        });
        reminderId = testReminder._id;
    
        // create gift associated to friend
        const testGift = await GiftRecommendation.create({
            title: 'test',
            image: 'photo',
            reason: 'this is a test',
            imageSearchQuery: 'photo',
            giftType: 'present',
            estimatedCost: '50',
            friend: friend._id
        });
        giftId = testGift._id.toString();

    });

    it('should delete a user\'s friend only if the friend belongs to user and is found', async () => {

        // expect 403 forbidden for requests made to delete other user's friends
        const response = await request(app)
            .delete(`/api/friends/${friendId}/delete`)
            .set('Authorization', `Bearer ${otherToken}`)
            .expect(403);

        // expect 200 success for requests made to delete own friends
        const response2 = await request(app)
            .delete(`/api/friends/${friendId}/delete`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        // verify that friend was deleted in db
        const deletedFriend = await Friend.findById(friendId);
        expect(deletedFriend).toBeNull();

        // expect 404 not found for requests made to delete friends that don't exist
        const response3 = await request(app)
            .delete(`/api/friends/${friendId}/delete`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404);

    });

    it('should delete any documents related to deleted friend', async () => {
        // verify that associated reminders were deleted
        const deletedReminder = await Reminder.findById(reminderId);
        expect(deletedReminder).toBeNull();

        // verify that associated gifts were deleted
        const deletedGift = await GiftRecommendation.findById(giftId);
        expect(deletedGift).toBeNull();
        
    });
});


describe('PUT /api/friends/:id/update', () => {
    it('should update a user\'s friend', async () => {
        const friendData = {
            name: 'test',
            gender: 'female',
            dob: '1997-01-26',
            photo: 'string',
            tags: [],
            favoriteGifts: [],
            user: user.payload,
        }

        const testTag = await Tag.create({
            type: "custom",
            title: "Test Tag"
        });

        const updateString = {
            ...friendData,
            name: 'testing'
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
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const updatedFriend = await Friend.findById(friend._id);
        expect(updatedFriend?.name).toEqual(updateString.name);

        // tests if the tag array of ObjectIds will be updated
        const tagsResponse = await request(app)
            .put(`/api/friends/${friend._id}/update`)
            .send(updateTags)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        const updatedTagsFriend = await Friend.findById(friend._id);
        expect(updatedTagsFriend?.tags).toEqual(updateTags.tags);
    });
});

describe("POST /api/friends/:id/tags", () => {

    // initialize variables for ids
    let friendId = '';

    beforeAll(async () => {
        // clear out tag collection
        await Tag.deleteMany({});

        // create friend
        const friendData = {
            name: 'test',
            gender: 'female',
            dob: '1997-01-26',
            photo: 'string',
            tags: [],
            favoriteGifts: [],
            user: user.payload,
        }
        
        const friend = await Friend.create(friendData);
        friendId = friend._id.toString();
    });
    
    it("should associate tags, new and existing, to friend", async () => {

        // create tag
        const existingTag = await Tag.create({ 
            title: "existingTag",
            type: "custom"
        });

        // initialize request body with existingTag, and a title for new tag
        const requestBody = [existingTag, 'newTag'];

        // expect 200
        const response = await request(app)
            .post(`/api/friends/${friendId}/tags`)
            .send(requestBody)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        // ensuring that tag was created with the string passed 
        const createdTag = await Tag.findOne({ title: 'newTag' });
        expect(createdTag).toBeDefined();

        const friend = await Friend.findById(friendId);

        // ensuring that friend.tags has both tags
        expect(friend?.tags.length).toEqual(2);
        expect(friend?.tags).toContainEqual(existingTag._id);
        expect(friend?.tags).toContainEqual(createdTag?._id);
    });

    it("should remove associated tags from friend", async () => {
        // request with empty body, expect 200
        const response = await request(app)
            .post(`/api/friends/${friendId}/tags`)
            .send([])
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        // ensuring that associated tags was removed
        const friend = await Friend.findById(friendId);
        expect(friend?.tags.length).toEqual(0);

        // ensuring that tags were not deleted from the collection
        const count = await Tag.countDocuments();
        expect(count).toEqual(2);
    });
});

// describe("POST /api/friends/:id/upload", () => {
//     it("should upload a photo and return its url", async () => {
//         await Friend.deleteMany({});
//         const friend = await Friend.create({
//             name: 'test',
//             dob: '1997-01-26',
//             user: user.payload,
//             gender: 'female'
//         });
//         const res = await request(app)
//             .post(`/api/friends/${friend._id}/upload`)
//             .set('Authorization', `Bearer ${token}`)
//             .attach('photo', './testimage.png');

//         expect(res.status).toBe(200);
//         expect(res.body.message).toBe('Photo uploaded successfully');
//         expect(res.body.photoUrl).toBeDefined();
//         const photoUrl = res.body.photoUrl;

//         const retrievedFriend = await Friend.findOne({ name: 'test', user: user.payload });
//         expect(retrievedFriend).not.toBeNull();
//         expect(retrievedFriend?.photo).toEqual(photoUrl);

//     }, 10000);
// });