import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../../index';
import bearer from '../../middleware/bearer';

import Tag, { ITag }from './models/tag';
import { isTypedArray } from 'util/types';

const app = configureApp([bearer]);


declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
});

afterAll(async () => {
    await Tag.deleteMany({ title: { $regex: 'suggestion' } });
    await mongoose.connection.close();
});


describe('GET /api/tags/', () => {
    it('should return all default tags', async () => {
        const count = await Tag.countDocuments({ type: { $ne: 'custom' } });

        const response = await request(app)
            .get('/api/tags/')
            .expect(200);

        expect(response.body.length).toEqual(count);
    });
});

describe('GET /api/tags/suggestions/', () => {
    it('should return an array of tags matching search term', async () => {
        const suggestionTags = await Tag.insertMany([{ title: 'suggestion1' }, { title: 'suggestion2' }]);

        const searchTerm = 'suggestion'

        const response = await request(app)
            .get(`/api/tags/suggestions?search=${searchTerm}`)
            .expect(200);

        expect(response.body).toHaveLength(suggestionTags.length);

        response.body.forEach((tag : ITag) => {
            expect(tag).toHaveProperty('_id');
            expect(tag.title).toContain(searchTerm);
        });
    });

    it('should return message if no matching tags', async () => {
        const searchTerm = 'invalidTag';

        const response = await request(app)
        .get(`/api/tags/suggestions?search=${searchTerm}`)
        .expect(200);

        expect(response.body.message).toBe('No suggested tags');
    });
});
