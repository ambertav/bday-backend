import mongoose, { Schema } from "mongoose";

const refreshTokenSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    expires: {
        type: Date,
        required: true,
    },
    revoked: {
        type: Boolean,
        required: true,
        default: false,
    }
}, {
    timestamps: true
});

refreshTokenSchema.methods.revoke = function () {
    this.revoked = true;
    return this.save();
}

refreshTokenSchema.methods.isValid = function () {
    return !this.revoked && this.expires > Date.now();
}

refreshTokenSchema.statics.isValid = async function (token: string, user: string | Schema.Types.ObjectId): Promise<boolean> {
    try {
        const storedToken = await this.findOne({ token });
        return storedToken
            && storedToken.user.equals(user)
            && !storedToken.revoked
            && storedToken.expires > Date.now();
    } catch (error) {
        console.error(error);
        return false;
    }
}

export interface IRefreshTokenMethods {
    revoke: () => any;
    isValid: () => boolean;
}

export interface IRefreshTokenDocument extends mongoose.Document, IRefreshTokenMethods {
    user: Schema.Types.ObjectId;
    token: string;
    expires: Date;
    revoked: boolean;
}

export interface IRefreshTokenModel extends mongoose.Model<IRefreshTokenDocument>{
    isValid: (token: string, user: string | Schema.Types.ObjectId) => Promise<boolean>; 
}

export default mongoose.model<IRefreshTokenDocument, IRefreshTokenModel>('RefreshToken', refreshTokenSchema);