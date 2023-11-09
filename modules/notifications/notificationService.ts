import User from "../user/models/user";

export interface IApproachingBirthday {
    userId: string;
    friendId: string;
    hoursUntil: number;
}

export async function getApproachingBirthdays(cutoffHours: number = 96, lastNotificationClearance: number = 24): Promise<IApproachingBirthday[]> {
    try {
        // find users, who have either emailNotification or pushNotification set to true in their UserProfile
        // whose friends have an upcoming birthday with less than cutoffHours, calculated according to the timezone settings in UserProfile (for each user)
        // AND who haven't been sent a Notification in more than lastNotificationClearance
        const currentDateTime = new Date();
        const notificationClearanceDateTime = new Date(currentDateTime.getTime() - lastNotificationClearance * 3600000);
        const users = await User.aggregate([
            {
                // Lookup UserProfile to filter users based on notification settings
                $lookup: {
                    from: 'userprofiles',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'userProfile'
                }
            },
            { $unwind: '$userProfile' },
            {
                // Match users with notifications enabled
                $match: {
                    $or: [
                        { 'userProfile.emailNotifications': true },
                        { 'userProfile.pushNotifications': true }
                    ]
                }
            },
            // Lookup friends for each user
            {
                $lookup: {
                    from: 'friends',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'friends'
                }
            },
            { $unwind: '$friends' },
            // Calculate the hours until each friend's upcoming birthday
            // Convert the friends' dob to their upcoming birthday date
            {
                $addFields: {
                    'thisYearBirthday': {
                        $dateFromParts: {
                            'year': { $year: currentDateTime },
                            'month': { $month: '$friends.dob' },
                            'day': { $dayOfMonth: '$friends.dob' },
                            'timezone': '$userProfile.timezone'
                        }
                    }
                }
            },
            {
                $addFields: {
                    'nextYearBirthday': {
                        $dateFromParts: {
                            'year': { $add: [{ $year: currentDateTime }, 1] },
                            'month': { $month: '$friends.dob' },
                            'day': { $dayOfMonth: '$friends.dob' },
                            'timezone': '$userProfile.timezone'
                        }
                    }
                }
            },
            {
                $addFields: {
                    'upcomingBirthday': {
                        $cond: {
                            if: { $lt: ['$thisYearBirthday', currentDateTime] }, // if the birthday this year has passed
                            then: '$nextYearBirthday', // use the birthday next year
                            else: '$thisYearBirthday' // otherwise, use the birthday this year
                        }
                    }
                }
            },
            {
                // Calculate hours until upcoming birthday
                $addFields: {
                    'hoursUntilBirthday': {
                        $dateDiff: {
                            startDate:  currentDateTime,
                            endDate: '$upcomingBirthday',
                            unit: 'hour',
                            timezone: '$userProfile.timezone'
                        }
                    }
                }
            },
            {
                // Filter those not within cutoffHours
                $match: {
                    'hoursUntilBirthday': {$lte: cutoffHours}
                }
            },
            // Lookup notifications to exclude friends with recent notifications
            {
                $lookup: {
                    from: 'notifications',
                    let: { userId: '$userProfile.user', friendId: '$friends._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$userId', '$$userId'] },
                                        { $eq: ['$friendId', '$$friendId'] },
                                        { $gt: ['$dateSent', notificationClearanceDateTime] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'recentNotifications'
                }
            },
            // Exclude friends with recent notifications
            { $match: { 'recentNotifications': { $size: 0 } } },
            // Project the final structure
            {
                $project: {
                    userId: '$userProfile.user',
                    friendId: '$friends._id',
                    hoursUntil: '$hoursUntilBirthday'
                }
            }
        ]).exec();
        return users.map(user => ({
            userId: user.userId.toString(),
            friendId: user.friendId.toString(),
            hoursUntil: user.hoursUntil
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
}