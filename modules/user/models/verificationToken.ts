import mongoose, { Schema } from 'mongoose';

// intended to be a whitelist
const verificationTokenSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
    },
}, {
    timestamps: true
});

export interface IVerificationTokenDocument extends mongoose.Document {
    user: Schema.Types.ObjectId;
    token: string;
    expiresAt: Date;
}

export default mongoose.model <IVerificationTokenDocument> ('VerificationToken', verificationTokenSchema);