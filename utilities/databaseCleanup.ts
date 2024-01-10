import Tag from '../modules/tags/models/tag';
import Notification from '../modules/notifications/models/notification';
import Reminder from '../modules/notifications/models/reminder';
import VerificationToken from '../modules/user/models/verificationToken';
import Agenda from 'agenda';


export async function cleanTags () {
    try {
        const orphanAggregation = await Tag.aggregate([
            {
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
                $match: { taggedFriends: { $size: 0 }, type: 'custom' } 
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

        const deletedTags = await Tag.deleteMany({ _id: { $in: orphanTags }}); // delete all the tags in array
        return console.log(`${deletedTags.deletedCount} orphaned tags deleted`);
        
    } catch (error : any) {
        console.error('Error occured while cleaning tags collection: ', error.message);
    }
}

export async function cleanVerificationTokens () {
    try {
        const currentDateTime = new Date();

        const deletedTokens = await VerificationToken.deleteMany({ expiresAt: { $lt: currentDateTime } });

        if (deletedTokens.deletedCount === 0) console.log('No expired tokens found');
        else console.log(`Deleted ${deletedTokens.deletedCount} expired verification tokens`);

    } catch (error : any) {
        console.error('Error occured while cleaning verification token collection: ', error.message);
    }
}

export async function cleanOutdatedNotifications () {
    try {
        // setting outdated notifications as notifications created more than 30 days ago
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // find and delete outdated notifications
        const deletedNotifications = await Notification.deleteMany({ createdAt: { $gt: thirtyDaysAgo} });

        if (deletedNotifications.deletedCount === 0) console.log('No outdated notifications found');
        else console.log(`Deleted ${deletedNotifications.deletedCount} outdated notifications`);

    } catch (error : any) {
        console.error('Error occurred while cleaning notification collection: ', error.message);
    }
}

export async function cleanOutdatedReminders () {
    try {

        const currentDateTime = new Date();

        // setting outdated reminders based on type / when the reminder is created
        // goal is to prevent overlap of reminders for any given friend, thus has to take into account each user's notification schedule
        /* 
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


    } catch (error : any) {
        console.error('Error occurred while cleaning reminders collection: ', error.message);
    }
}


export async function startCleanupAgenda () {
    const agenda = new Agenda({ db: { address: process.env.DATABASE_URL!, collection: 'Jobs' } });
    agenda.define('clean out orphaned and expired documents', async () => {
        console.log('running orphaned tag cleanup');
        await cleanTags();

        console.log('running expired verification token cleanup');
        await cleanVerificationTokens();

        console.log('running outdated notifications cleanup');
        await cleanOutdatedNotifications();

        // console.log('running outdated reminders cleanup');
        // await cleanOutdatedReminders();

        console.log('Done');
    });
    await agenda.start();
    await agenda.every('24 hours', 'clean out orphaned and expired documents');
}