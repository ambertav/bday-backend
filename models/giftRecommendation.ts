import mongoose from "mongoose";

const giftRecommendationSchema = new mongoose.Schema({
    title: String,
    image: String,
    reason: String,
    imageSearchQuery: String,
    giftType: String,
    estimatedCost: String,
    friend: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Friend' }
},
{
    timestamps: true,
});

export default mongoose.model("GiftRecommendation", giftRecommendationSchema);