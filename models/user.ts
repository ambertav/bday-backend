import mongoose from "mongoose";
import { compareHash, hashString } from "../utilities/crypto-service";

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
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_, ret) {
            delete ret.passwordHash;
        }
    }
});

userSchema.pre("save", async function (next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }
    try {
        this.passwordHash = await hashString(this.passwordHash!)
        next();
    } catch (error: any) {
        return next(error);
    }
});

userSchema.methods.checkPassword = function (password: string) {
    return compareHash(password, this.password);
}

export interface IUserMethods {
    checkPassword(password: string): Promise<boolean>;
}

export interface IUserDocument extends mongoose.Document, IUserMethods {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
}

export default mongoose.model<IUserDocument>("User", userSchema);