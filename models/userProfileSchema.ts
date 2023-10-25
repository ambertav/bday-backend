import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
    bio: {
        type: String,
        maxLength: 500,
        minLength: 3,
        required: false
    },
    photo: {
        type: String,
    },
    interests: [String],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
},{
    timestamps: true
});

export default userProfileSchema;