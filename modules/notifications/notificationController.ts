import { Request, Response } from 'express';
import { IExtReq } from '../../interfaces/auth';
import Notification from './models/notification';
import UserProfile from '../profile/models/userProfile';
import mongoose from 'mongoose';
import { daysUntilBirthday } from '../../utilities/friendUtilities';

export async function getNotifications (req : Request & IExtReq, res : Response) {
    try {
        const notifications = await Notification.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(req.user!) } // find notifications for user
            },
            {
                $sort: { isRead: -1, createdAt: 1 } // sort so that isRead: false and soonest creation are first
            },
            {
                $project: { // only need isRead and friend info
                    friendId: 1,
                    isRead: 1,
                }
            },
        ]);

        if (notifications.length > 0) { // if notifications...
            await Notification.populate(notifications, { path: 'friendId', select: '_id name dob'}); // populate friend info

            // find user's timezone for daysUntilBirthday calculation
            const userProfile = await UserProfile.findOne({ user: req.user }).select('timezone');
            let timezone = userProfile?.timezone;
            if (!timezone) timezone = 'UTC';

            // calculate daysUntilBirthday, sort into current and past notifications based on if read
            const { current, past } = notifications.reduce((result, n) => {
                const days = daysUntilBirthday(n.friendId.dob, timezone!);

                if (n.isRead === true) result.past.push({ ...n, friendId: { ...n.friendId.toJSON(), daysUntilBirthday: days }});
                else if (n.isRead === false) result.current.push({ ...n, friendId: { ...n.friendId.toJSON(), daysUntilBirthday: days }});

                return result;


            }, { current: [], past: [] });
        
            return res.status(200).json({ current, past }); // return current and past
        }

        else return res.status(200).json({ message: 'No notifications' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}