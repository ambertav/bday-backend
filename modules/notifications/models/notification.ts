import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['push', 'email'],
        default: 'push'
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
    dateSent: {
        type: Date,
        required: true,
        default: Date.now()
    },
    ticketId: {
        type: String,
        default: '',
    }
},
{
    timestamps: true
});

export default mongoose.model('Notification', notificationSchema);