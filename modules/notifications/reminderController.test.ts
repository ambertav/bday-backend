import mongoose from 'mongoose';
import request from 'supertest';
import { configureApp } from '../../index';
import bearer from '../../middleware/bearer';
import jwt, { JwtPayload } from 'jsonwebtoken';

import Friend from '../friends/models/friend';
import User from '../user/models/user';
import Reminder, { IReminderDocument } from '../notifications/models/reminder';

const app = configureApp([bearer]);

declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Reminder.deleteMany({});
    await Friend.deleteMany({});
    await User.deleteMany({});
});

afterAll(async () => {
    try {
        await Reminder.deleteMany({});
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
let reminders: IReminderDocument[];

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

    // create friends associated to user

    const friendData = {
        name: 'test',
        gender: 'female',
        dob: '1997-01-26',
        photo: 'string',
        tags: [],
        favoriteGifts: [],
        user: user.payload,
    }

    const friend1 = await Friend.create(friendData);
    const friend2 = await Friend.create(friendData);
    
    // create reminders associated to user and friends

    const reminderData = {
        type: 7,
        user: user.payload,
    }

    await Reminder.insertMany([
        { ...reminderData, friend: friend1._id }, 
        { ...reminderData, friend: friend2._id }
    ]);

    // query database and store array of reminders for checks throughout tests
    reminders = await Reminder.find({ user: user.payload });
});


describe('GET /api/reminders/', () => {
    it('should return all reminders associated with user', async () => {
        const response = await request(app)
            .get('/api/reminders/')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
       
        // checks presence of past key
        expect(response.body.past).toEqual([]);

        // ensures that current has all users reminders that were queried
        expect(response.body.current.length).toBe(reminders.length);
    })

    it('should return message when no reminders', async () => {
        // make request with other user that has no friends or reminders, expect 200
        const response = await request(app)
            .get('/api/reminders/')
            .set('Authorization', `Bearer ${otherToken}`)
            .expect(200);
    
        expect(response.body.message).toBe('No reminders');
    });
});

describe('PUT /api/reminders/read/', () => {
    it('should accept array of reminder ids and update isRead values to true', async () => {
        // ensuring initial value of reminders
        expect(reminders.every(r => r.isRead === false)).toBe(true);

        // create array of reminder ids
        const reminderIds = reminders.map(r => r._id);

        const response = await request(app)
            .put('/api/reminders/read')
            .send({ reminderIds })
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body.message).toBe('Reminders marked as read successfully');
        
        // re-query for reminders
        const updatedReminders = await Reminder.find({ user: user.payload });
        // ensuring that each isRead value was updated to true
        expect(updatedReminders.every(r => r.isRead === true)).toBe(true);

    });
});

describe('DELETE /api/reminders/:id/delete', () => {
    it('should delete a reminder', async () => {
        // ensuring initial length of reminders is equal to 2
        expect(reminders.length).toBe(2);

        // store an id of reminder to delete
        const reminderIdToDelete = reminders[0]._id;

        const response = await request(app)
            .delete(`/api/reminders/${reminderIdToDelete}/delete`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        
        expect(response.body.message).toBe('Reminder deleted successfully');

        // query for deleted reminder, expect null returned
        const deletedReminder = await Reminder.findById(reminderIdToDelete);
        expect(deletedReminder).toBeNull();

        // recount reminder collection and expect 1
        const count = await Reminder.countDocuments({ user: user.payload });
        expect(count).toBe(1);
    });
});