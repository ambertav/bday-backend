import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../../index';
import bearer from '../../middleware/bearer';

import Tag from './models/tag';

const app = configureApp([bearer]);


declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
});

afterAll(async () => {
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

