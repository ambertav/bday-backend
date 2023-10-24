import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../index';
import bearer from '../middleware/bearer';

import Tag from '../models/tag';
import { getTags } from './tagController';

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
    it('should return all tags', async () => {
        const response = await request(app)
            .get('/api/tags/');
        
        expect(response.statusCode).toBe(200);
    });
});