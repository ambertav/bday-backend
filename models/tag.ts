import mongoose from "mongoose";

const tagSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["relationship", "gender", "aesthetics", "hobby", "custom"],
        default: "custom",
        required: true
    },
    title: {
        type: String,
        maxLength: 100,
        minLength: 3,
        required: true,
        lowercase: true
    }
});

export default mongoose.model("Tag", tagSchema);