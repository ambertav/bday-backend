import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../../index';
import bearer from '../../middleware/bearer';
import jwt, { JwtPayload } from 'jsonwebtoken';

import Friend from "../friends/models/friend";
import User from '../user/models/user';
import Tag from '../tags/models/tag';
import GiftRecommendation from './models/giftRecommendation';


let token: string;
let user: JwtPayload;
let friendId: string;

const app = configureApp([bearer]);

declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Friend.deleteMany({});
    await User.deleteMany({});
    await GiftRecommendation.deleteMany({});
    await Tag.deleteMany({});

    // manually create user and with verified email
    await User.create({
        email: "test@email.com",
        passwordHash: "123456Aa!",
        verified: true,
    });

    // log user in and save the corresponding token
    const userResponse = await request(app)
        .post('/api/users/login')
        .send({
            email: "test@email.com",
            password: "123456Aa!",
        });

    token = userResponse.body.accessToken;
    user = jwt.decode(token) as JwtPayload;

    const tags = await Tag.insertMany([
        { title: 'family', type: 'custom' },
        { title: 'gamer', type: 'custom' }
    ]);

    const friend = await Friend.create({
        name: 'test',
        gender: 'female',
        dob: '1997-01-26',
        photo: 'string',
        tags: [tags[0]._id, tags[1]._id],
        favoriteGifts: [],
        user: user.payload
    });

    friendId = friend._id.toString();

});

afterAll(async () => {
    try {
        await GiftRecommendation.deleteMany({});
        await Tag.deleteMany({});
        await Friend.deleteMany({});
        await User.deleteMany({});
    } finally {
        await mongoose.connection.close();
    }
});


// describe('POST /api/friends/:id/generate-gift', () => {
//     it('should return a json of gift recommendations from openai call', async () => {

//         const response = await request(app)
//             .post(`/api/friends/${friendId}/generate-gift`)
//             .send({
//                 tags: ['family', 'gamer'],
//                 giftTypes: ['present', 'experience', 'donation'],
//                 budget: 50
//             })
//             .set('Authorization', `Bearer ${token}`)
//             .expect(200);

//         expect(response.body.recommendations).toBeDefined();

//     }, 30000);
// });


describe('POST /api/friends/:id/favorites', () => {
    it('should add a gift recommendation to friend\'s favorite gifts', async () => {

        const response = await request(app)
            .post(`/api/friends/${friendId}/favorites`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: "Live monkey",
                reason: "Your friend looks like a monkey",
                imageSearchQuery: "live monkey",
                imgSrc: "https://placeholder.com/monkey.png",
                giftType: 'present',
                estimatedCost: '50'
            })
            .expect(201);

        // checking return of created gift recommendation
        expect(response.body.recommendation).toBeDefined();
        
        // query database and ensure that it was created
        const gift = await GiftRecommendation.findById(response.body.recommendation._id);
        expect(gift).toBeDefined();

        const friend = await Friend.findById(friendId);
        // ensuring that gift recommendation was associated
        expect(friend?.favoriteGifts.length).toBe(1);
        expect(friend?.favoriteGifts).toContainEqual(gift?._id);
    });
});

describe('DELETE /api/friends/:id/favorites/:favoriteId', () => {
    it("should delete a favorited gift from collection and unassociate from friend", async () => {
        // find existing favorite gift
        const favorite = await GiftRecommendation.findOne({ friend: friendId });

        const response = await request(app)
            .delete(`/api/friends/${friendId}/favorites/${favorite?._id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body.message).toBe("Favorite gift removed");

        // ensuring that favorite was deleted from database
        const deletedFavorite = await GiftRecommendation.findById(favorite?._id);
        expect(deletedFavorite).toBeNull();

        const friend = await Friend.findById(friendId);
        // ensuring that gift recommendation was unassociated
        expect(friend?.favoriteGifts.length).toBe(0);
    });
});