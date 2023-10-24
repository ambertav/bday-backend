import mongoose from "mongoose";
import User from "./user";
import userProfile from "./userProfile";

declare global {
    var __MONGO_URI__: string;
}

beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
    await User.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("User Model", () => {
    it("should correctly hash a password", async () => {
        const password = "123456aA!";
        const user = await User.create({
            firstName: "test",
            lastName: "test",
            email: "test@test",
            dob: "1990-01-01",
            gender: "male",
            passwordHash: password,
        });
        expect(user.passwordHash).not.toEqual(password);
    });

    it("should not return password hash in JSON", async () => {
        const user = await User.findOne({ firstName: "test" });
        expect(user).not.toBeNull();
        const userJson = user?.toJSON();
        expect(userJson?.passwordHash).toBeFalsy();
    });

    it("should automatically create a profile when user is created", async () => {
        const profiles = await userProfile.find({});
        expect(profiles.length).toBeGreaterThan(0);
    });

});