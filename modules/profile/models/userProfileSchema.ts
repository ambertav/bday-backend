import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
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
    tel: Number,
    dob: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'other']
    },
    location: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_, ret) {
            if (ret.dob instanceof Date) {
                ret.dob = ret.dob.toISOString().split('T')[0]; // Format date as 'yyyy-mm-dd'
            }
        }
    }
});

userProfileSchema.pre("save", async function (next) {
    if (this.isModified('dob')) {
        if (this.dob > new Date()) {
            const error = new Error('Date of birth cannot be in the future');
            return next(error);
        }
    }
});

export default userProfileSchema;