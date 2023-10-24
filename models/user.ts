import mongoose from "mongoose";
import { compareHash, hashString } from "../utilities/cryptoService";
import userProfileSchema from "./userProfileSchema";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    tel:{
        type: Number,
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_, ret) {
            delete ret.passwordHash;
        }
    }
});

function validatePasswordPattern(val: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\.\*!@_\-\(\)\[\]\=\?\'\"\\\/\#\$\%\|\^\&\+\:\;\!\<\>])[a-zA-Z\d\.\*!@_\-\(\)\[\]\=\?\'\"\\\/\#\$\%\|\^\&\+\:\;\!\<\>]{8,}$/.test(val);
}

userSchema.pre("save", async function (next) {
    // Automatically create a new blank user profile when user is created
    if(this.isNew){
        const Profile = mongoose.model("UserProfile", userProfileSchema);
        await Profile.create({user: this._id});
    }

    if (!this.isModified('passwordHash')) {
        return next();
    }
    try {
        if (!validatePasswordPattern(this.passwordHash!))
            throw new Error("Password must have at least 1 lower-case, 1 upper-case letter, 1 digit and 1 special character");
        this.passwordHash = await hashString(this.passwordHash!)
        next();
    } catch (error: any) {
        return next(error);
    }
});

userSchema.methods.checkPassword = function (password: string) {
    return compareHash(password, this.passwordHash);
}

export interface IUserMethods {
    checkPassword(password: string): Promise<boolean>;
}

export interface IUserDocument extends mongoose.Document, IUserMethods {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    tel: number;
}

export default mongoose.model<IUserDocument>("User", userSchema);