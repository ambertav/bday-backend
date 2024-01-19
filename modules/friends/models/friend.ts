import mongoose from 'mongoose';
import { GIFT_PREFERENCES } from '../../../utilities/constants';

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
    includeInNotifications: {
        type: Boolean,
        default: true
    },
    hasGift: {
        type: Boolean,
        default: false,
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
    },
    favoriteGifts:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GiftRecommendation',
    }]
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

export interface IFriendDocument extends mongoose.Document {
    name: string;
    location: string;
    gender: string;
    dob: Date;
    photo: string;
    includeInNotifications: boolean;
    hasGift: boolean;
    tags: mongoose.Types.ObjectId[];
    user: mongoose.Types.ObjectId;
    giftPreferences: string[];
    favoriteGifts: mongoose.Types.ObjectId[];
}

export interface IFriendResult extends IFriendDocument {
    daysUntilBirthday: number,
    cardColor: string | null,
}

export default mongoose.model <IFriendDocument> ('Friend', friendSchema);
