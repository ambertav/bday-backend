import User from "../user/models/user";
import mongoose from "mongoose";
import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { ticketCache } from "../../utilities/cache";
import userProfile from "../profile/models/userProfile";
import Notification from "./models/notification";
import Reminder, { IReminderDocument } from './models/reminder';
import deviceInfo from "./models/deviceInfo";
import { sendMail } from "../../utilities/emailService";
import { SendMailOptions } from 'nodemailer';
import { FRONTEND_BASE_URL } from "../../utilities/constants";
import Agenda from "agenda";

const { EMAIL_USER } = process.env;

export interface IApproachingBirthday {
    user: {
        userId: string;
        email: string;
        token: string | null;
        emailNotifications: boolean;
        pushNotifications: boolean;
    }
    friends: Array<{
        friendId: string;
        friendName: string;
        daysUntil: number;
    }>
}


export async function getApproachingBirthdays(lastNotificationClearance: number = 24): Promise<IApproachingBirthday[]> {
    try {
        // find users
        // whose friends have an upcoming birthday within the user's preferred notification schedule, calculated according to the timezone settings in UserProfile (for each user)
        // AND who haven't been sent a Notification in more than lastNotificationClearance
        const currentDateTime = new Date();
        const notificationClearanceDateTime = new Date(currentDateTime.getTime() - lastNotificationClearance * 3600000);
        const notificationList = await User.aggregate([
            {
                // lookup and unwind userProfile 
                $lookup: {
                    from: 'userprofiles',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'userProfile'
                }
            },
            { $unwind: '$userProfile' },
            // Lookup and unwind friends for each user
            {
                $lookup: {
                    from: 'friends',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'friends'
                }
            },
            { $unwind: '$friends' },
            // Exclude friends with includeInNotifications: false
            {
                $match: { 'friends.includeInNotifications': true }
            },
            // Calculate the days until each friend's upcoming birthday
            // Convert the friends' dob to their upcoming birthday date
            {
                $addFields: {
                    'thisYearBirthday': {
                        $dateFromParts: {
                            year: { $year: currentDateTime },
                            month: { $month: '$friends.dob' },
                            day: { $dayOfMonth: '$friends.dob' },
                            timezone: '$userProfile.timezone'
                        }
                    }
                }
            },
            {
                $addFields: {
                    'nextYearBirthday': {
                        $dateFromParts: {
                            year: { $add: [{ $year: currentDateTime }, 1] },
                            month: { $month: '$friends.dob' },
                            day: { $dayOfMonth: '$friends.dob' },
                            timezone: '$userProfile.timezone'
                        }
                    }
                }
            },
            {
                $addFields: {
                    'upcomingBirthday': {
                        $cond: {
                            if: { $lt: [{ $month: '$friends.dob' }, { $month: currentDateTime}] }, // if the birthday this year has passed
                            then: '$nextYearBirthday', // use the birthday next year
                            else: {
                                $cond: {
                                    if: { $and: [
                                        { $eq: [{ $month: '$friends.dob' }, { $month: currentDateTime } ] }, 
                                        { $lt: [{ $dayOfMonth: '$friends.dob' }, { $dayOfMonth: currentDateTime } ] }, // if months are equal and dob day is less...
                                    ] },
                                    then: '$nextYearBirthday', // use the birthday next year
                                    else: '$thisYearBirthday', // otherwise use birthday of this year
                                },
                            },
                        }
                    }
                }
            },
            {
                // Calculate hours until upcoming birthday
                $addFields: {
                    'daysUntilBirthday': {
                        $dateDiff: {
                            startDate: currentDateTime,
                            endDate: '$upcomingBirthday',
                            unit: 'day',
                            timezone: '$userProfile.timezone'
                        }
                    }
                }
            },
            {
                // Filter friends with daysUntilBirthday that matches user's preferred notification schedule
                $match: {
                    $expr: {
                        $in: ['$daysUntilBirthday', { $ifNull: ['$userProfile.notificationSchedule', []] }]
                    }
                }
            },
            // Exclude friends for whom reminders were already made
            {
                $lookup: {
                    from: 'reminders',
                    let: { user: '$userProfile.user', friend: '$friends._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$user', '$$user'] },
                                        { $eq: ['$friend', '$$friend'] },
                                        { $gt: ['$createdAt', notificationClearanceDateTime] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'recentReminder'
                }
            },
            { $match: { 'recentReminder': { $size: 0 } } },
            // Lookup deviceIds for each user
            {
                $lookup: {
                    from: 'deviceinfos',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'device'
                }
            },
            {
                $unwind: { path: '$device', preserveNullAndEmptyArrays: true } // unwind if available
            },
            // group list by user, and include array of applicable friends
            {
                $group: {
                    _id: '$userProfile.user',
                    user: {
                        $first: {
                            userId: '$userProfile.user',
                            email: '$email',
                            token: '$device.deviceToken',
                            emailNotifications: '$userProfile.emailNotifications',
                            pushNotifications: '$userProfile.pushNotifications',
                        }
                    },
                    friends: {
                        $push: {
                            friendId: '$friends._id',
                            friendName: '$friends.name',
                            daysUntil: '$daysUntilBirthday'
                        }
                    }
                }
            },
            // project final structure, see IApproachingBirthdays interface
            {
                $project: {
                    _id: 0,
                    user: '$user',
                    friends: '$friends'
                }
            }
        ]).exec();

        return notificationList;

    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function createReminders (item : IApproachingBirthday) {
    // sessions over insertMany for 
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // promises to create notifications from approaching birthdays
        // map through user friends
        const reminderPromises = item.friends.map(async (friend) => { 
            try {
                const reminder = await Reminder.create([
                    {
                        type: friend.daysUntil,
                        user: item.user.userId, // user id
                        friend: friend.friendId,
                    }], { session });
    
                  return reminder[0]; // return created reminder
    
            } catch (error : any) {
                console.error('Error creating reminder: ', error.message);
                return null; // return null for failed reminder creation
            }
        });
    
        // awaiting for all reminder promises to be resolved
        const reminders = await Promise.all(reminderPromises);
        // check if active transaction before commiting
        if (session.inTransaction()) await session.commitTransaction();
    
        return reminders.filter(reminder => reminder !== null); // return successful notifications
    } catch (transactionError : any) {
        // check if active transaction before aborting
        if (session.inTransaction()) await session.abortTransaction();
        console.error('Error creating reminders: ', transactionError.message);
        throw transactionError; // throw error 
    } finally {
        // end the session
        session.endSession();
    }
}

export async function sendExpoNotifications(list: IApproachingBirthday[]) {
    const expo = new Expo();
    // filter only push notification allowed users
    const pushList = list.filter(item => !!item.user.pushNotifications && !!item.user.token);
    // TODO: Choose message body randomly from pool
    const messages = [];
    for (let item of pushList) {
        let message : string = '';

        // if user only has one friend with an approaching birthday, create customized message
        if (item.friends.length === 1) {
            message = `${item.friends[0].friendName}'s birthday is ${item.friends[0].daysUntil} days away! Did you get them a gift yet?`;
        // else, create a general message to lead them to reminders page for more info
        } else if (item.friends.length > 1) {
            message = `You have multiple friends with birthdays approaching! Visit your reminders page to see all upcoming birthdays and make sure to get them gifts!`;
        }

        messages.push({
            to: item.user.token,
            sound: 'default',
            body: message,
        });
    }

    let chunks = expo.chunkPushNotifications(messages as ExpoPushMessage[]);
    let tickets: ExpoPushTicket[] = [];
    let ticketsToTokensMap = new Map<number, string>();
    let ticketIDsToTokensMap = new Map<string, string>();

    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(ticketChunk);
            tickets.push(...ticketChunk);
            // NOTE: If a ticket contains an error code in ticket.details.error, you
            // must handle it appropriately. The error codes are listed in the Expo
            // documentation:
            // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
            // Map each ticket index to corresponding ticket

            ticketChunk.forEach(async (ticket, idx) => {
                ticketsToTokensMap.set(tickets.length - ticketChunk.length + idx, chunk[idx].to as string);
                // Map each ticket id to corresponding ticket, if it was successful
                if (ticket.status === 'ok' && ticket.id) {
                    const tkn = chunk[idx].to as string
                    // ticketIDsToTokensMap.set(ticket.id, tkn);
                    try {
                        const device = await deviceInfo.findOne({ deviceToken: tkn })
                            if (device) {
                                const index = pushList.findIndex(item => item.user.token === device.deviceToken)
                                const notification = await Notification.create({
                                    user: pushList[index].user.userId,
                                    ticketId: ticket.id
                                });
                            }
                    } catch (error : any) {
                        console.error('Error creating notification with ticket id: ', error);
                    }
                }
            });
        } catch (error : any) {
            console.error('Error sending push notifications: ', error);
        }
    }

    const unregisterList: string[] = [];
    // If we received DeviceNotRegistered error, modify user profile to remain a good citizen
    tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            const token = ticketsToTokensMap.get(idx);
            if (token) {
                unregisterList.push(token);
            }
        }
    });
    await updateNotificationPreference(unregisterList);

    // Removing receipt logic since I was unable to get an error response to examine
    // and plan the receipt logic accordingly

    // set ticket cache
    // const identifier = Date.now().toString();
    // console.log('IDENTIFER, ', identifier);
    // ticketCache.set(identifier, JSON.stringify(ticketIDsToTokensMap, replacer));
    // setTimeout(async () => {
    //     await handleExpoReceipts(identifier);
    // }, 15 * 60 * 1000);
}

async function updateNotificationPreference(token: string[]) {
    await userProfile.updateMany({ deviceToken: token }, { pushNotifications: false }, { upsert: false });
}

export async function handleExpoReceipts(identifier: string) {
    try {
        const expo = new Expo();
        console.log("RUNNING RECEIPT HANDLER")
        const ticketMap = JSON.parse(ticketCache.get(identifier)!, reviver)
        console.log('TICKETMAP:', ticketMap);
        // let receiptIds = [];
        // for (let ) {
        //     // NOTE: Not all tickets have IDs; for example, tickets for notifications
        //     // that could not be enqueued will have error information and no receipt ID.
        //     if (ticket.id) {
        //         receiptIds.push(ticket.id);
        //     }
        // }
        const unregisterList: string[] = [];

        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketMap.keys());
        // Like sending notifications, there are different strategies you could use
        // to retrieve batches of receipts from the Expo service.
        for (let chunk of receiptIdChunks) {
            try {
                let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
                console.log(receipts);

                // The receipts specify whether Apple or Google successfully received the
                // notification and information about an error, if one occurred.
                for (let receiptId in receipts) {
                    // @ts-expect-error
                    let { status, message, details } = receipts[receiptId];
                    if (status === 'ok') {
                        continue;
                    } else if (status === 'error') {
                        console.error(
                            `There was an error sending a notification: ${message}`
                        );
                        // @ts-expect-error
                        if (details && details.error) {
                            // The error codes are listed in the Expo documentation:
                            // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                            // You must handle the errors appropriately.
                            // @ts-expect-error
                            console.error(`The error code is ${details.error}`);
                            console.error('Ther error message is ', message);
                            console.error('details: ', details);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    } catch (error) {
        console.error(error);
    }

}

function replacer(key: any, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}

function reviver(key: any, value: any) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}

export async function sendEmailNotifications (list : IApproachingBirthday[]) {

}

export async function startAgenda() {
    const agenda = new Agenda({ db: { address: process.env.DATABASE_URL!, collection: 'Jobs' } });
    agenda.define('send birthday reminders', async () => {
        console.log('running birthday check');
        const birthdays = await getApproachingBirthdays();

        if (birthdays.length) {
            // map birthday list and run create reminders for each user
            console.log('creating reminders');
            await Promise.all(birthdays.map(item => createReminders(item)));
    
            console.log('sending push notifications');
            await sendExpoNotifications(birthdays);
    
            // email notifications
            // console.log('Sending email notifications')
            // await sendEmailNotifications(birthdays);
        }

        console.log('Done');
    });
    await agenda.start();
    await agenda.every('1 minute', 'send birthday reminders');
}