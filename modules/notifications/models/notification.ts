import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    type: {
        type: Number,
        required: true,
        enum: [30, 7, 3, 0], // enum of values corresponding to notification schedule, indicates what type of notification was sent
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
    sent: {
        date: { // date sent
            type: Date,
            default: Date.now()
        },
        method: { // how the notification was sent
            type: [ String ],
            enum: ['push', 'email', 'default'],
            default: ['default'] // default would just be displayed in reminders page
        }
    },
    isRead: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});

export default mongoose.model('Notification', notificationSchema);