import mongoose from "mongoose";
import Friend from "./friend";
import User from "../../user/models/user";

const now = new Date();
let userId: string;
declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await Friend.deleteMany({});
    await User.deleteMany({});
    const user = await User.create({
        email: "test@email.com",
        passwordHash: "123456Aa!",
        name: "test",
        dob: "1990-08-08",
        gender: "female",
        lastName: "user"
    });
    userId = user._id.toString();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Friend DOB Validation', () => {
    it('should allow DOB in the past', async () => {
        const validDOB = new Date(now);
        validDOB.setFullYear(now.getFullYear() - 100);

        const validFriend = await Friend.create({
            name: 'test',
            dob: validDOB,
            photo: 'test',
            gender: 'female',
            user: userId
        });

        expect(validFriend).toBeDefined();
    });

    it('should reject a future date for DOB', async () => {
        const futureDOB = new Date(now);
        futureDOB.setFullYear(now.getFullYear() + 1);

        try {
            await Friend.create({
                name: 'test',
                dob: futureDOB,
                photo: 'test',
                gender: 'female',
                user: userId,
            });

            // fails test if friend was created with invalid DOB
            fail('Expected an error, but the friend was created');
        } catch (error: any) {
            // passes test if friend is not created
            expect(error.message).toContain('Date of birth cannot be in the future');
        }
    });


    it('should allow a DOB that is equal to the current date', async () => {
        const newborn = await Friend.create({
            name: 'newborn',
            dob: now,
            photo: 'test',
            gender: 'female',
            user: userId,
        });

        expect(newborn).toBeDefined();
    });

    it('should fill in the proper default values upon creation', async () => {
        const friend = await Friend.findOne({ name: 'test' });

        // ensures that friend is defined before checking desired values
        expect(friend).toBeDefined();

        // checking default values
        expect(friend?.hasGift).toBe(false);
        expect(friend?.includeInNotifications).toBe(true);
    });
});