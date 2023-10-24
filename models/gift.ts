import mongoose from 'mongoose';

const giftSchema = new mongoose.Schema({
    name: String,
    friend: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Friend',
    },
}, {
    timestamps: true,
});

export interface IGiftDocument extends mongoose.Document {
    name: string;
    friend: mongoose.Types.ObjectId,
}

export default mongoose.model <IGiftDocument> ('Gift', giftSchema);