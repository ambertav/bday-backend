import Friend from '../modules/friends/models/friend';
import Notification from '../modules/notifications/models/notification';
import Tag from '../modules/tags/models/tag';
import RefreshToken from '../modules/user/models/refreshToken';
import Reminder from '../modules/notifications/models/reminder';
import VerificationToken from '../modules/user/models/verificationToken';
import Agenda from 'agenda';


export async function cleanTags() {
    try {
        const orphanAggregation = await Tag.aggregate([{
                $lookup: {
                    from: 'friends',
                    // matching referenced tag ids in friends collection with ids in tag collection
                    localField: '_id',
                    foreignField: 'tags',
                    // creating array on tag documents containing friends that reference it
                    as: 'taggedFriends'
                }
            },
            {
                // filtering to return tags in which the array is empty (the tags that are not referenced)
                // only filter out custom (user created) tags
                $match: {
                    taggedFriends: {
                        $size: 0
                    },
                    type: 'custom'
                }
            },
            {
                $project: {
                    _id: 1 // using just the id field
                }
            }
        ]);

        // if no orphans found, return
        if (orphanAggregation.length === 0) return console.log('No orphaned tags found');

        // convert to array with ids only
        const orphanTags = Array.from(orphanAggregation).map(tag => tag._id.toString());

        const deletedTags = await Tag.deleteMany({ _id: { $in: orphanTags } }); // delete all the tags in array
        return console.log(`${deletedTags.deletedCount} orphaned tags deleted`);

    } catch (error: any) {
        console.error('Error occured while cleaning tags collection: ', error.message);
    }
}

export async function cleanVerificationTokens() {
    try {
        const currentDateTime = new Date();

        const deletedTokens = await VerificationToken.deleteMany({ expiresAt: { $lt: currentDateTime } });

        if (deletedTokens.deletedCount === 0) console.log('No expired tokens found');
        else console.log(`Deleted ${deletedTokens.deletedCount} expired verification tokens`);

    } catch (error: any) {
        console.error('Error occured while cleaning verification token collection: ', error.message);
    }
}

export async function cleanRefreshTokens() {
    try {
        const currentDateTime = new Date();

        const deletedTokens = await RefreshToken.deleteMany({ expiresAt: { $lt: currentDateTime } });

        if (deletedTokens.deletedCount === 0) console.log('No expired tokens found');
        else console.log(`Deleted ${deletedTokens.deletedCount} expired refresh tokens`);

    } catch (error: any) {
        console.error('Error occured while cleaning refresh token collection: ', error.message);
    }
}

export async function cleanOutdatedNotifications() {
    try {
        // setting outdated notifications as notifications created more than 30 days ago
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // find and delete outdated notifications
        const deletedNotifications = await Notification.deleteMany({ createdAt: { $gt: thirtyDaysAgo } });

        if (deletedNotifications.deletedCount === 0) console.log('No outdated notifications found');
        else console.log(`Deleted ${deletedNotifications.deletedCount} outdated notifications`);

    } catch (error: any) {
        console.error('Error occurred while cleaning notification collection: ', error.message);
    }
}

export async function cleanOutdatedReminders() {
    try {
        // setting outdated reminders based on type / when the reminder is created
        // goal is to prevent overlap of reminders for any given friend, thus has to take into account each user's notification schedule

        /* 
            Aggregation pipeline logic summary:

                30 days out --> 
                    if 7 in notificationSchedule, delete 23 days after
                    else if 3 in notificationSchedule && not 7, delete 27 days after
                    else delete 30 days after

                7 days out --> 
                    if 3 in notificationSchedule, delete 4 days after
                    else delete 7 days after

                3 days out -->
                    delete 3 days after

                day of -->
                    delete 3 days after 
        */

        const outdatedReminders = await Reminder.aggregate([
            {
                // lookup and unwind userProfile
                $lookup: {
                    from: 'userprofiles',
                    localField: 'user',
                    foreignField: 'user',
                    as: 'userProfile'
                }
            },
            { $unwind: '$userProfile' },
            {
                // add outdated field based on type of reminder and user's notification schedule
                $addFields: {
                    'outdated': {
                        $switch: {
                            branches: [
                                // case: reminder type 30 && notification schedule includes 7
                                {
                                    case: {
                                        $and: [
                                            { $eq: ['$type', 30] },
                                            { $in: [7, '$userProfile.notificationSchedule'] }
                                        ]
                                    },

                                    // remove after 23 days
                                    then: { $add: ['$createdAt', { $multiply: [1000, 60, 60, 24, 23] }] }
                                },
                                // case: reminder type 30 && notification includes 3 && notifiction does NOT include 7  
                                {
                                    case: {
                                        $and: [
                                            { $eq: ['$type', 30] },
                                            { $in: [3, '$userProfile.notificationSchedule'] },
                                            { $not: { $in: [7, '$userProfile.notificationSchedule'] } }
                                        ]
                                    },

                                    // remove after 27 days
                                    then: { $add: ['$createdAt', { $multiply: [1000, 60, 60, 24, 27] }] }
                                },
                                // case: reminder type 30 && notification schedule does NOT include 3 or 7
                                {
                                    case: { $eq: ['$type', 30] },

                                    // remove after 30 days
                                    then: { $add: ['$createdAt', { $multiply: [1000, 60, 60, 24, 30] }] }
                                },
                                // case: reminder type 7 && notification schedule includes 3 days
                                {
                                    case: {
                                        $and: [
                                            { $eq: ['$type', 7] },
                                            { $in: [3, '$userProfile.notificationSchedule'] }
                                        ]
                                    },
                                    // remove after 3 days
                                    then: { $add: ['$createdAt', { $multiply: [1000, 60, 60, 24, 4] }] }
                                },
                                // case: reminder type 7 && notification schedule does NOT include 3
                                {
                                    case: { $eq: ['$type', 7] },

                                    // remove after 7 days
                                    then: { $add: ['$createdAt', { $multiply: [1000, 60, 60, 24, 7] }] }
                                },
                                // case: reminder type 3 or 0
                                {
                                    case: { $in: ['$type', [3, 0]] },
                                    
                                    // remove after 3 days
                                    then: { $add: ['$createdAt', { $multiply: [1000, 60, 60, 24, 3] }] }
                                }
                            ],
                            // default case that sets outdated to null
                            default: null
                        }
                    }
                }
            },                     
            // match reminders for which the outdated date has passed relative to current date
            {
                $match: { 'outdated': { $lt: new Date() } }
            },
            {
                // project only id and outdated date
                $project: { 
                    _id: 1,
                    outdated: 1,
                }
            }
        ]);

        // if no outdated reminders found, return
        if (outdatedReminders.length === 0) return console.log('No outdated reminders found');

        // convert to array with ids only
        const outdatedRemindersIds = Array.from(outdatedReminders).map(reminder => reminder._id.toString());

        const deletedReminders = await Reminder.deleteMany({ _id: { $in: outdatedRemindersIds } }); // delete all the reminders in array
        return console.log(`${deletedReminders.deletedCount} outdated reminders deleted`);

    } catch (error: any) {
        console.error('Error occurred while cleaning reminders collection: ', error.message);
    }
}

export async function resetFriendHasGift () {
    try {
        // auto resets hasGift 5 days after friend's birthday passes in preparation for next birthday
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

        /* 
            Aggregation pipeline logic:
                using day of the year for comparison between dob and fiveDaysAgo

                to account for change of December into January
                    if dob month is December && fiveDaysAgo month is January -->
                        add 365 days to the fiveDaysAgo day of the year value
        */

        const updateResult = await Friend.updateMany(
            {
                $expr: {
                    $gte: [
                        {
                            $cond: {
                                if: {
                                    $and: [
                                        // if dob month is in december
                                        { $eq: [{ $month: { date: '$dob', timezone: 'UTC' } }, 12] }, 
                                        // and fiveDaysAgo date month is in January
                                        { $eq: [{ $month: { date: fiveDaysAgo, timezone: 'UTC' } }, 1] },
                                    ],
                                },
                                // then add 365 days to fiveDaysAgo
                                then: { $add: [{ $dayOfYear: { date: fiveDaysAgo, timezone: 'UTC' } }, 365] },
                                // else just use the standard day of the year
                                else: { $dayOfYear: { date: fiveDaysAgo, timezone: 'UTC' } },
                            },
                        },
                        // compare with the day of the year of dob
                        { $dayOfYear: { date: '$dob', timezone: 'UTC' } }
                    ],
                },
                hasGift: true, // check if friend hasGift is set to true
            },
            {
              // Set hasGift to false for the found friends
              $set: { hasGift: false },
            }
        );

        if (updateResult.modifiedCount === 0) console.log('No friends found to reset hasGift');
        else console.log(`${updateResult.modifiedCount} friend(s) hasGift fields were reset successfully`);

    } catch (error : any) {
        console.error('Error occurred while reseting friend hasGift field: ', error.message);
    }
}


export async function startCleanupAgenda() {
    const agenda = new Agenda({
        db: {
            address: process.env.DATABASE_URL!,
            collection: 'Jobs'
        }
    });
    agenda.define('clean out orphaned and expired documents', async () => {
        console.log('running orphaned tag cleanup');
        await cleanTags();

        console.log('running expired verification token cleanup');
        await cleanVerificationTokens();

        console.log('running expired refresh token cleanup'); 
        await cleanRefreshTokens();

        console.log('running outdated notifications cleanup');
        await cleanOutdatedNotifications();

        console.log('running outdated reminders cleanup');
        await cleanOutdatedReminders();

        console.log('running hasGift reset');
        await resetFriendHasGift();

        console.log('Done');
    });
    await agenda.start();
    await agenda.every('24 hours', 'clean out orphaned and expired documents');
}