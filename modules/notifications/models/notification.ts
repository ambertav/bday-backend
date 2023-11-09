import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['push', 'email'],
        default: 'email'
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
    }
},
{
    timestamps: true
});

export default mongoose.model('Notification', notificationSchema);