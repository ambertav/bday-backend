import mongoose from "mongoose";
import User from "./user";

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
        const password = "1234";
        const user = await User.create({
            firstName: "test",
            lastName: "test",
            email: "test@test",
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

});