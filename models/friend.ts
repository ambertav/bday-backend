import mongoose from 'mongoose';
import Gift from './gift';
import { GIFT_PREFERENCES } from '../utilities/constants';

const friendSchema = new mongoose.Schema({
    name: {
        type: String,
        maxLength: 30,
        required: true,
        trim: true,
    },
    gender: {
        type: String,
        enum: ["female", "male", "other"],
        required: true,
    },
    location: {
        type: String,
        maxLength: 30,
        trim: true,
    },
    dob: {
        type: Date,
        required: true,
    },
    photo: {
        type: String,
        required: false,
    },
    bio: {
        type: String,
        maxLength: 200,
        trim: true,
    },
    interests: {
        type: [ String ],
    },
    tags: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tag'
        }
    ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    giftPreferences: {
        type: [String],
        validate: {
            validator: function(value: string[]) {
              return value.every(v => GIFT_PREFERENCES.includes(v.toLowerCase()));
            },
            message: "Invalid gift type."
          }
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

// validation for DOB input
friendSchema.pre('save', function (next) {
    const now = new Date();
    if (this.dob > now) {
        const error = new Error('Date of birth cannot be in the future');
        return next(error);
    }
    next();
});

friendSchema.pre('deleteOne', async function (next) {
    // removing all gift recommendation references on deletion of friend
    const doc = await this.model.findOne(this.getFilter());
    try {
        await Gift.deleteMany({ friend: doc._id });
        next();
    } catch (error : any) {
        console.error('Error deleting gift recommendations:', error);
        next(error);
    }
});

export interface IFriendDocument extends mongoose.Document {
    name: string;
    location: string;
    gender: string;
    dob: Date;
    photo: string;
    bio: string;
    interests: string[];
    tags: mongoose.Types.ObjectId[],
    user: mongoose.Types.ObjectId,
    giftPreferences: string[];
}

export default mongoose.model <IFriendDocument> ('Friend', friendSchema);
