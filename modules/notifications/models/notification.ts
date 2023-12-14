import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['push', 'email'],
        default: 'push'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Friend'
    },
    dateSent: {
        type: Date,
        required: true,
        default: Date.now()
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