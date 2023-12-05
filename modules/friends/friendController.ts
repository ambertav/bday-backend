import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Friend, { IFriendDocument, IFriendResult } from './models/friend';
import UserProfile from '../profile/models/userProfile';
import { IExtReq } from '../../interfaces/auth';
import { HTTPError, sendError } from '../../utilities/utils';
import { formatFriendsData, daysUntilBirthday } from '../../utilities/friendUtilities';
import Tag from '../tags/models/tag';
import { UploadedFile } from 'express-fileupload';
import { PutObjectCommand, s3BaseUrl, s3Client } from '../../utilities/s3upload';


interface IFriendRequest {
    name: string;
    location: string;
    gender: string;
    dob: Date;
    photo: string;
    bio: string;
    interests: string[];
    tags: mongoose.Types.ObjectId[],
    giftPreferences: string[];
}


export async function addFriend(req: Request & IExtReq, res: Response) {
    try {
        const { name, location, gender, dob, bio, interests, tags, giftPreferences }: IFriendRequest = req.body;

        const newFriend: IFriendDocument = new Friend({
            name,
            location,
            gender,
            dob,
            bio,
            interests,
            tags,
            giftPreferences,
            user: req.user
        });

        await newFriend.save();

        if (newFriend) return res.status(201).json(newFriend);

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function findFriends(req: Request & IExtReq, res: Response) {
    try {
        // find user's timezone to incorporate to daysUntilBirthday calculation
        const userProfile = await UserProfile.findOne({ user: req.user }).select('timezone');
        let timezone = userProfile?.timezone;
        if (!timezone) timezone = 'UTC';

        const friends = await Friend.aggregate([
            {
              $match: { user: new mongoose.Types.ObjectId(req.user!) }, // searching for users friends
            },
            {
                $addFields: {
                    today: new Date(),
                    dobMonth: { $month: '$dob' },
                    dobDay: { $dayOfMonth: '$dob' },
                },
            },
            {
                $addFields: {
                    nextBirthday: { // finds the next birthday with dob month, day and today's year
                        $dateFromParts: {
                            year: { $year: '$today' },
                            month: '$dobMonth',
                            day: '$dobDay',
                            timezone: timezone
                        },
                    },
                },
            },
            {
                $addFields: {
                    nextBirthday: {
                        $cond: {
                            if: { $lt: ['$dobMonth', { $month: '$today' } ] }, // if the month is before today's month...
                            then: {
                                $dateFromParts: {
                                    year: { $add: [{ $year: '$nextBirthday' }, 1] }, // add 1 year to next birthday
                                    month: '$dobMonth',
                                    day: '$dobDay',
                                    timezone: timezone
                                },
                            },
                            else: {
                                $cond: {
                                    if: { $and: [
                                        { $eq: ['$dobMonth', { $month: '$today' } ] }, 
                                        { $lt: ['$dobDay', { $dayOfMonth: '$today' } ] }, // if months are equal and dob day is less...
                                    ] },
                                    then: {
                                        $dateFromParts: {
                                            year: { $add: [{ $year: '$nextBirthday' }, 1] }, // add 1 year to next birthday
                                            month: '$dobMonth',
                                            day: '$dobDay',
                                            timezone: timezone
                                        },
                                    },
                                    else: '$nextBirthday',
                                },
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    daysUntilBirthday: {
                        $dateDiff: { // find the dateDiff between today and the next birthday, return in number of days
                            startDate: '$today',
                            endDate: '$nextBirthday',
                            unit: 'day',
                            timezone: timezone
                        },
                    },
                },
            },
            {
                $sort: {
                    daysUntilBirthday: 1, // sort by daysUntilBirthday in ascending order
                },
            },
            {
                $project: { // removes unnecessary fields
                    today: 0,
                    dobMonth: 0,
                    dobDay: 0,
                    nextBirthday: 0,
                },
            },
            {
                $set: { 
                    'dob': { // transforms dob into string format, (toJSON not working with aggregation)
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$dob'
                        }
                    }
                }
            }
        ]);
 
        await Friend.populate(friends, { path: 'favoriteGifts' }); // populates gifts
        
        if (friends.length > 0) {
            // formats friends query result into object containing today, thisWeek, thisMonth, and laterOn keys
            const result = formatFriendsData(friends);
            return res.status(200).json(result);
        }
        else if (friends.length === 0) return res.status(200).json({ message: 'No friends found' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function getFriendBirthdays (req: Request & IExtReq, res: Response) {
    try {
        const friendBirthdays = await Friend.aggregate([
            {
              $match: { user: new mongoose.Types.ObjectId(req.user!) }
            },
            { // project necessary fields
              $project: {
                _id: 1,
                dob: 1,
                name: 1,
                monthDay: { $dateToString: { format: '%m-%d', date: '$dob' } } // extract dob month and dob day
              }
            },
            {
              $group: { // groups friends by birthday (dob month and dob day)
                _id: '$monthDay',
                friends: {
                  $push: {
                    name: '$name',
                    dob: '$dob',
                    _id: '$_id'
                  }
                }
              }
            },
            {
              $group: { // group again to structure as array of key-value pairs
                _id: null,
                birthdays: {
                  $push: {
                    k: '$_id', // key is birthday
                    v: '$friends' // value is array of friends with birthday
                  }
                }
              }
            },
            {
              $replaceRoot: { // reshape result into object with birthdays as keys and array of friends as values
                newRoot: {
                  $arrayToObject: '$birthdays'
                }
              }
            }
          ]);
          

          if (friendBirthdays.length === 0) { // if no friends found, return message for frontend
              return res.status(200).json({ message: 'No friends found' });
            } else {
            // result is array of length 1 containing the desired object to return
          return res.status(200).json(friendBirthdays[0]);
        }
    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
    }

export async function showFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        const friend = await Friend.findOne({ _id: friendId, user: req.user }).populate("tags").populate("favoriteGifts");
        if (!friend) return res.status(404).json('Friend not found');

        // find user's timezone to incorporate to daysUntilBirthday calculation
        const userProfile = await UserProfile.findOne({ user: req.user }).select('timezone');
        let timezone = userProfile?.timezone;
        if (!timezone) timezone = 'UTC';

        // formate result with friend data and calculated daysUntilBirthday
        const result: IFriendResult = {
            ...friend.toJSON(),
            daysUntilBirthday: daysUntilBirthday(friend!.dob, timezone),
        };

        return res.status(200).json(result);

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function deleteFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;

        const friend = await Friend.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });

        if (friend?.user.toString() === req.user?.toString()) { // verifies that friend is associated with logged in user
            const result = await Friend.findByIdAndDelete(friendId);
            if (result) return res.status(200).json({ message: 'Friend deleted successfully' });
        }

        return res.status(403).json({ message: 'User not authorized for this request' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function updateFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;

        const friend = await Friend.findById(friendId);
        if (!friend) return res.status(404).json({ message: 'Friend not found' });

        if (friend?.user.toString() === req.user?.toString()) { // Verify that friend is associated with the logged in user
            const { interests, ...others } = req.body;

            const updateFields = {
                ...others,
                interests,
            };

            delete updateFields.user; // so that it can't update the user
            delete updateFields.photo; // use photo upload endpoint instead
            const result = await Friend.updateOne({ _id: friendId }, { $set: updateFields });
            if (result) return res.status(200).json({ message: 'Friend updated' });
        }

        return res.status(403).json({ message: 'User not authorized for this request' });

    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

export async function updateTags (req : Request & IExtReq, res : Response) {
    try {
        const friendId = req.params.id;
        const friend = await Friend.findById(friendId);
        if (!friend) throw { status: 404, message: 'Friend not found' };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: 'User not authorized for this request' }

        const tags = req.body;

        // map tags into array of promises
        const tagPromises : Promise <Types.ObjectId>[] = tags.map(async (tag : any) => {

            // checks if tag is object with id to skip querying
            if (tag._id) { // if tag has an id...
                
                // ensure that its a valid ObjectId
                if (!Types.ObjectId.isValid(tag._id)) throw { status: 400, message: 'Invalid ObjectId provided for the tag' };
                return new Types.ObjectId(tag._id); // return tag id
            } else {
                let title = tag.title ? tag.title.toLowerCase() : tag.toLowerCase(); // extracts title, considers object or string
                let existingTag = await Tag.findOne({ title }); // find the existing tag with title
                if (!existingTag) existingTag = await Tag.create({ title, type: 'custom' }); // create if it doesn't exist
                return new Types.ObjectId(existingTag._id); // return tag id
            }
        });

        const resolvedTags = await Promise.all(tagPromises); // resolving promises, compiling array of ObjectIds
        
        friend.tags = resolvedTags; // update friends.tags
        await friend.save(); // save friend

        res.status(200).json({ message: 'Tags updated successfully' });

    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function addPreference(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        let { preference } = req.body;
        preference = preference.toLowerCase();
        const friend = await Friend.findById(friendId).populate("tags").populate("favoriteGifts");
        if (!friend) {
            throw { status: 404, message: 'Friend not found' };
        }
        if (!friend.giftPreferences.includes(preference)) {
            friend.giftPreferences.push(preference);
            await friend.save();
        }
        res.status(200).json({ friend });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function removePreference(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        let { preference } = req.body;
        preference = preference.toLowerCase();
        const friend = await Friend.findById(friendId).populate("tags");
        if (!friend) {
            throw { status: 404, message: 'Friend not found' };
        }
        const index = friend.giftPreferences.indexOf(preference);
        if (index > -1) {
            friend.giftPreferences.splice(index, 1);
            await friend.save();
        }
        res.status(200).json({ friend });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function uploadFriendPhoto(req: Request & IExtReq, res: Response) {
    try {
        const file = req.files!.photo as UploadedFile;
        const fileType = file.name.split('.')[1];
        const fileData = file.data
        const friend = await Friend.findById(req.params.id);
        if(!friend) return res.status(404).json({message: "Friend not found"});
        if (friend?.user.toString() !== req.user?.toString()) return res.status(403).json({message: "User not authorized for this request" });
        const fileName = `${req.params.id}.${fileType}`
    
        const bucketParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            Body: fileData
        };
        const result = await s3Client.send(new PutObjectCommand(bucketParams));
        const s3ProfilePhotoUrl = `${s3BaseUrl}${bucketParams.Bucket}/${fileName}`;

        try {
            friend.photo = s3ProfilePhotoUrl;
            await friend.save();

            res.setHeader('Cache-Control', 'no-cache');
            return res.status(200).json({ photoUrl: s3ProfilePhotoUrl, message: 'Photo uploaded successfully' });

        } catch (userError) {
            console.error('Error updating user profile photo:', userError);
            res.status(500).send('Error updating user profile photo');
        }
    } catch (s3Error) {
        console.error('Error uploading profile photo to AWS S3:', s3Error);
        res.status(500).send('Error uploading profile photo to AWS S3');
    }
}