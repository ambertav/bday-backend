import mongoose from "mongoose";

const giftRecommendationSchema = new mongoose.Schema({
    title: String,
    image: String,
    reason: String,
    friend: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Friend' }
},
{
    timestamps: true,
});

export default mongoose.model("GiftRecommendation", giftRecommendationSchema);