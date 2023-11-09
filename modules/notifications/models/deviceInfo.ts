import mongoose from "mongoose";

const deviceInfoSchema = new mongoose.Schema({
    deviceToken: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
});

export default mongoose.model('DeviceInfo', deviceInfoSchema);