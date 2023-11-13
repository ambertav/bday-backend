import mongoose, { CallbackError } from "mongoose";
import { compareHash, hashString } from "../../../utilities/cryptoService";
import userProfileSchema from "../../profile/models/userProfileSchema";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_, ret) {
            delete ret.passwordHash;
            if (ret.dob instanceof Date) {
                ret.dob = ret.dob.toISOString().split('T')[0]; // Format date as 'yyyy-mm-dd'
            }
        }
    }
});

function validatePasswordPattern(val: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\.\*!@_\-\(\)\[\]\=\?\'\"\\\/\#\$\%\|\^\&\+\:\;\!\<\>])[a-zA-Z\d\.\*!@_\-\(\)\[\]\=\?\'\"\\\/\#\$\%\|\^\&\+\:\;\!\<\>]{8,}$/.test(val);
}

userSchema.pre("save", async function (next) {
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
    name: string;
    passwordHash: string;
    tel: number;
    dob: Date;
    gender: string;
}

export default mongoose.model<IUserDocument>("User", userSchema);