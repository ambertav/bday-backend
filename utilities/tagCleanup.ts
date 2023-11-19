import Tag from '../modules/tags/models/tag';

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

        const deletedTags = await Tag.deleteMany({ _id: { $in: orphanTags }}); // delete all the tags in array
        return console.log(`${deletedTags.deletedCount} orphaned tags deleted`);
        
    } catch (error : any) {
        console.error('Error occured while cleaning tags collection: ', error.message);
    }
}