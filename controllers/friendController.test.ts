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

let token: string;
let otherToken: string;

let user: JwtPayload;
let otherUser: JwtPayload;

beforeAll(async () => {
    const userResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
            name: "test",
            dob: "1990-08-08",
            gender: "female",
            lastName: "user"
        });

    token = userResponse.body.accessToken;
    user = jwt.decode(token) as JwtPayload;

    const otherUserResponse = await request(app)
        .post('/api/users/')
        .send({
            email: "testingt@email.com",
            password: "123456Aa!",
            name: "test",
            lastName: "user",
            dob: "1990-08-08",
            gender: "female",
        });

    otherToken = otherUserResponse.body.accessToken;
    otherUser = jwt.decode(otherToken) as JwtPayload;
});

describe('POST /api/friends/create', () => {
    it('should create a new friend', async () => {

        const requestBody = {
            name: 'test',
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


describe('GET /api/friends/', () => {
    describe('GET /api/friends/', () => {
        it('should retrieve all of the user\'s friends', async () => {
            const friendData = {
                name: 'test',
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
            name: 'test',
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
            name: 'test',
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
            name: 'test',
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
            name: 'testing'
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
        expect(updatedFriend?.name).toEqual(updateString.name);

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

describe("POST /api/friends/:id/tags", () => {
    it("should add an existing tag to friend", async () => {
        const friendData = {
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            interests: ['testing', 'this is a test'],
            tags: [],
            user: user.payload
        }
        const friend = await Friend.create(friendData);
        const friendId = friend._id.toString();

        const tagData = { title: "existingTag", type: "custom" };
        const existingTag = await Tag.create(tagData);
        const existingTagId = existingTag._id.toString();
        const response = await request(app)
            .post(`/api/friends/${friendId}/tags`)
            .send({ title: "existingTag", type: "custom" })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body._id).toBe(existingTagId);
    });
    it("should create and add a non-existing tag to friend", async () => {
        await Tag.deleteMany({});
        await Friend.deleteMany({});
        const friendData = {
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            interests: ['testing', 'this is a test'],
            tags: [],
            user: user.payload
        }
        const friend = await Friend.create(friendData);
        const friendId = friend._id.toString();
        expect(friend.tags.length).toEqual(0);
        const response = await request(app)
            .post(`/api/friends/${friendId}/tags`)
            .send({ title: "newTag", type: "custom" })
            .set('Authorization', `Bearer ${token}`)
            .expect(201);

        expect(response.body._id).toBeDefined();
        const retrievedFriend = await Friend.findById(friendId);
        expect(retrievedFriend?.tags.length).toBeGreaterThan(0);
    });
    it("should not add the same tag twice to friend", async () => {
        const friend = await Friend.findOne({}).populate("tags");
        const tagCount = friend?.tags.length;
        expect(tagCount).toBeGreaterThan(0);
        const tag = await Tag.findById(friend?.tags[0]);
        expect(tag).not.toBeNull();
        const response = await request(app)
            .post(`/api/friends/${friend?._id}/tags`)
            .send({ title: tag?.title, type: tag?.type })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        const retrievedFriend = await Friend.findById(friend?._id);
        expect(retrievedFriend?.tags.length).toEqual(tagCount);
    });
});

describe("DELETE /api/friends/:id/tags/:tagId", () => {
    it("should remove an existing tag from friend", async () => {
        const friend = await Friend.findOne({}).populate("tags");
        const tag = await Tag.findById(friend?.tags[0]);
        const tagCount = friend?.tags.length;

        const response = await request(app)
            .delete(`/api/friends/${friend?._id}/tags/${tag?._id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body.message).toBe("Tag removed");
        const retrievedFriend = await Friend.findById(friend?._id).populate("tags");
        expect(retrievedFriend?.tags.length).toEqual(tagCount! - 1);
    });

    it("should not throw an error if the tag does not exist on friend", async () => {
        const friend = await Friend.findOne({});  // Pick any friend

        // Create a tag that's not associated with the friend
        const tagData = { title: "unassociatedTag", type: "custom" };
        const unassociatedTag = await Tag.create(tagData);
        const unassociatedTagId = unassociatedTag._id.toString();

        const response = await request(app)
            .delete(`/api/friends/${friend?._id}/tags/${unassociatedTagId}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(204);
    });

    it("should not remove tag from a different user's friend", async () => {
        // Create a friend belonging to otherUser
        const otherFriendData = {
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            interests: ['testing', 'this is a test'],
            tags: [],
            user: otherUser.payload
        };
        const otherFriend = await Friend.create(otherFriendData);

        const tag = await Tag.findOne({}); // Any tag that exists in the DB

        const response = await request(app)
            .delete(`/api/friends/${otherFriend._id}/tags/${tag?._id}`)
            .set('Authorization', `Bearer ${token}`) // This should be first user's token
            .expect(403); // Forbidden

        expect(response.body.message).toBe("User not authorized for this request");
    });
});

describe("POST /api/friends/:id/preferences", () => {
    it("should add a preference and return friend object", async () => {
        await Friend.deleteMany({});
        const friend = await Friend.create({
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            user: user.payload,
        });
        const response = await request(app)
            .post(`/api/friends/${friend._id}/preferences`)
            .set('Authorization', `Bearer ${token}`)
            .send({ preference: "present" })
            .expect(200);
        expect(response.body.friend).toBeDefined();
        expect(response.body.friend.giftPreferences.length).toBeGreaterThan(0);
    });

    it("should throw an error if preference is not known", async () => {
        await Friend.deleteMany({});
        const friend = await Friend.create({
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            user: user.payload,
        });
        const response = await request(app)
            .post(`/api/friends/${friend._id}/preferences`)
            .set('Authorization', `Bearer ${token}`)
            .send({ preference: "unknownPreference" })
            .expect(500);
    });

});

describe("POST /api/friends/:id/preferences/remove", () => {
    it("should remove an existing preference and return friend object", async () => {
        await Friend.deleteMany({});
        const friend = await Friend.create({
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            giftPreferences: ["present", "experience"],
            user: user.payload,
        });
        const response = await request(app)
            .post(`/api/friends/${friend._id}/preferences/remove`)
            .set('Authorization', `Bearer ${token}`)
            .send({ preference: "present" })
            .expect(200);
        expect(response.body.friend).toBeDefined();
        expect(response.body.friend.giftPreferences).not.toContain("present");
    });

    it("should not throw an error if a known preference is not contained in the array", async () => {
        await Friend.deleteMany({});
        const friend = await Friend.create({
            name: 'test',
            dob: '1997-01-26',
            photo: 'string',
            bio: 'a test user',
            giftPreferences: ["experience"],
            user: user.payload,
        });
        const response = await request(app)
            .post(`/api/friends/${friend._id}/preferences/remove`)
            .set('Authorization', `Bearer ${token}`)
            .send({ preference: "present" })
            .expect(200);
        expect(response.body.friend).toBeDefined();
        expect(response.body.friend.giftPreferences).not.toContain("present");
    });
});

// describe("POST /api/friends/:id/upload", () => {
//     it("should upload a photo and return its url", async () => {
//         await Friend.deleteMany({});
//         const friend = await Friend.create({
//             name: 'test',
//             dob: '1997-01-26',
//             user: user.payload
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