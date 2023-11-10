import { Request, Response } from 'express'; 
import Tag from './models/tag';
import { IExtReq } from '../../interfaces/auth';


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