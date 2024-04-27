import { Request, Response } from 'express';
import { IExtReq } from '../../interfaces/auth';
import Reminder from './models/reminder';
import UserProfile from '../profile/models/userProfile';
import mongoose from 'mongoose';
import { daysFromBirthday } from '../../utilities/friendUtilities';

export async function getReminders (req : Request & IExtReq, res : Response) {
    try {
        const reminders = await Reminder.aggregate([
            {
                $match: { user: new mongoose.Types.ObjectId(req.user!) }
            },
            {
                $lookup: {
                    from: 'friends',
                    localField: 'friend',
                    foreignField: '_id',
                    as: 'friendData'
                }
            },
            {
                $unwind: '$friendData'
            },
            {
                $sort: { isRead: -1, 'friendData.dob': 1, createdAt: 1 }
            },
            {
                $project: {
                    friend: {
                        _id: '$friendData._id',
                        name: '$friendData.name',
                        dob: '$friendData.dob',
                        photo: '$friendData.photo',
                        hasGift: '$friendData.hasGift',
                    },
                    isRead: 1
                }
            }
        ]);
    
        
        if (reminders.length > 0) { // if reminders...
            // find user's timezone for daysUntilBirthday calculation
            const userProfile = await UserProfile.findOne({ user: req.user }).select('timezone');
            let timezone = userProfile?.timezone;
            if (!timezone) timezone = 'UTC';

            // calculate daysUntilBirthday, sort into current and past notifications based on if read
            const { current, past } = reminders.reduce((result, n) => {
                const days = daysFromBirthday(n.friend.dob, timezone! as string);

                if (n.isRead === true) result.past.push({ ...n, friend: { ...n.friend, daysUntilBirthday: days }});
                else if (n.isRead === false) result.current.push({ ...n, friend: { ...n.friend, daysUntilBirthday: days }});

                return result;

            }, { current: [], past: [] });
        
            return res.status(200).json({ current, past }); // return current and past
        }

        else return res.status(200).json({ message: 'No reminders' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function markReminderAsRead (req : Request & IExtReq, res : Response) {
    try {
        const updateReminders = await Reminder.updateMany(
            { _id: { $in: req.body.reminderIds }, user: req.user! },
            { $set: { isRead: true } }
        );

        res.status(200).json({ message: 'Reminders marked as read successfully' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function deleteReminder (req : Request & IExtReq, res : Response) {
    try {
        const deletedReminder = await Reminder.findOneAndDelete({
            _id: req.params.id, user: req.user!
        });

        res.status(200).json({ message: 'Reminder deleted successfully' });

    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}