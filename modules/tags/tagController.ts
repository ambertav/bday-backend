import { Request, Response } from 'express'; 
import Tag from './models/tag';
import { IExtReq } from '../../interfaces/auth';
import Agenda from "agenda";


export async function getDefaultTags (req : Request & IExtReq, res : Response) {
    try {
        const tags = await Tag.aggregate([
            {
                $match: { type: { $in: ['relationship', 'hobby', 'gender', 'aesthetics'] } } // only retrieving default / non custom tags
            },
            {
                $group: {
                    _id: '$type', // grouping by the type
                    tags: {
                        $push: {
                            _id: '$_id',
                            title: '$title'
                        }
                    }
                }
            },
            {
                $addFields: { section: '$_id' } // adding section to rename _id so that its clearer when rendering
            },
            {
                $sort: { section: -1 } // sort by section to retain consistent order
            },
            {
                $project: { 
                    _id: 0,
                    tags: 1,
                    section: 1
                }
            }
        ]);

        if (!tags || tags.length === 0) return res.status(404).json({ message: 'Tags not found'});

        return res.status(200).json(tags);
    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}


export async function getTagSuggestions (req : Request & IExtReq, res : Response) {
    try {
        const searchTerm = req.query.search as string || '';
        if (searchTerm === '') return;
        const suggested = await Tag.find({ 
            type: 'custom',
            title: {
                $regex: `^${searchTerm.toLowerCase()}`
            }
         });

         if (suggested.length === 0) return res.status(200).json({ message: 'No suggested tags' });

         return res.status(200).json(suggested);
    } catch (error : any) {
        return res.status(500).json({
            error: error.message
        });
    }
}

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
        console.log(orphanTags);

        const deletedTags = await Tag.deleteMany({ _id: { $in: orphanTags }}); // delete all the tags in array
        return console.log(`${deletedTags.deletedCount} orphaned tags deleted`);
        
    } catch (error : any) {
        console.error('Error occured while cleaning tags collection: ', error.message);
    }
}

export async function startTagAgenda () {
    const agenda = new Agenda({ db: { address: process.env.DATABASE_URL!, collection: 'Jobs' } });
    agenda.define('clean out orphaned tags', async () => {
        console.log("running tag cleanup");
        await cleanTags();
        console.log('Done');
    });
    await agenda.start();
    await agenda.every('24 hours', 'clean out orphaned tags');
}