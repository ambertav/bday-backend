import mongoose from "mongoose";
import { ISignupRequest } from "../../../interfaces/auth";
import User from "../models/user";
import UserProfile from "../../profile/models/userProfile";


export const signup = async (data: ISignupRequest): Promise<undefined | mongoose.Types.ObjectId> => {
    const session = await mongoose.startSession();
    let userId;
    await session.withTransaction(async () => {
        const user = new User({
            email: data.email,
            passwordHash: data.password
        });
        const profile = new UserProfile({
            tel: data.tel,
            location: data.location,
            name: data.name,
            dob: data.dob,
            gender: data.gender,
            user: user._id
        });
        await user.save({ session });
        await profile.save({ session });
        userId = user._id;
    });
    return userId;
}