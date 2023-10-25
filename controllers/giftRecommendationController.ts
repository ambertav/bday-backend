import { HTTPError, fetchImageThumbnail, sendError } from "../utilities/utils";
import GiftRecommendation from "../models/giftRecommendation";
import { Request, Response } from "express";
import Friend from "../models/friend";
import { IExtReq } from "../interfaces/auth";

const SYS_PROMPT = `**TASK**
Generate gift recommendations based on input.
**CONSTRAINTS**
+ You will be given an input in the input format. Base your recommendations on the provided input
+ You must only and exactly reply in the desired OUTPUT FORMAT. OUTPUT must include 5 gift ideas. Only reply as an array of JSON Objects as described in OUTPUT FORMAT
**INPUT FORMAT**
{
    "bio": "(optional) a short description of the person the gift is for",
    "giftPreferences": "(optional) what types of gifts the person preferes. i.e. present, experience, donation, etc.",
    "tags": ["an array of short tags desciribing the person, can be anything from gender to aesthetics to generic tags"],
    "budget": "the maximum ballpark cost of the gift recommendation",
}
**OUTPUT FORMAT**
[
    {
        "title": "title of the gift idea. Should be short. This title will be used to search online shopping channels",
        "reason": "a very short reasoning. Should be one senctence in the form of 'because [subject] [verb] [object]', i.e. 'because she loves her puppy'",
        "imageSearchQuery": "a simple short query to search for a thumbnail image representative of this gift idea",
    }
]`

export async function recommendGift(req: Request & IExtReq, res: Response) {
    try {
        const friend = await Friend.findById(req.params.id);
        if(!friend) throw {status: 404, message: "Friend not found"};
        let {tags, giftTypes, budget} = req.body;
        
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}