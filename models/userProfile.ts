import mongoose from 'mongoose';
import userProfileSchema from './userProfileSchema';

export default mongoose.model("UserProfile", userProfileSchema);