import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
    type: {
        type: Number,
        required: true,
        enum: [30, 7, 3, 0], // enum of values corresponding to notification schedule, indicates what type of reminder was sent
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    friend: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Friend'
    },
    isRead: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});

export interface IReminderDocument extends mongoose.Document {
    type: number;
    user: string;
    friend: string;
    isRead: boolean;
}

export default mongoose.model <IReminderDocument> ('Reminder', reminderSchema);