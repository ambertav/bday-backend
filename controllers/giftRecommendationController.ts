import { HTTPError, fetchImageThumbnail, sendError, rateLimiterOpenAI } from "../utilities/utils";
import GiftRecommendation from "../models/giftRecommendation";
import { Request, Response } from "express";
import Friend from "../models/friend";
import { IExtReq } from "../interfaces/auth";

import OpenAI from 'openai';
const openai = new OpenAI();


const SYS_PROMPT = `**TASK**
Generate gift recommendations based on input.
**CONSTRAINTS**
+ You will be given an input in the input format. Base your recommendations on the provided input
+ You must only and exactly reply in the desired OUTPUT FORMAT. OUTPUT must include 3 gift ideas. Only reply as an array of JSON Objects as described in OUTPUT FORMAT
**INPUT FORMAT**
{
    "giftTypes": "(required) what types of gifts the person preferes. i.e. present, experience, donation, etc.",
    "tags": ["(required)  an array of short tags desciribing the person, can be anything from gender to aesthetics to generic tags"],
    "budget": "the maximum ballpark cost of the gift recommendation",
    "age": "(required)  age of the person the gift is for",
"gender": "(required) gender of the person the gift is for"
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
        if (rateLimiterOpenAI.isRateLimited('limit reached')) return res.status(429).json({ message: 'Limit reached, try again later' });
        const friend = await Friend.findById(req.params.id);
        if (!friend) throw { status: 404, message: "Friend not found" };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: "User not authorized for this request" }

        const now = new Date();
        const year = now.getFullYear();
        const age = year - friend.dob.getFullYear();
        const gender = friend.gender;

        let { tags, giftTypes, budget } = req.body;

        const userContent = `{
            'giftTypes': ${giftTypes},
            'tags': ${tags},
            'age': ${age},
            'gender': ${gender},
            ${budget ? `'budget': ${budget}` : ''}
        }`

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { 'role': 'system', 'content': SYS_PROMPT },
                { 'role': 'user', 'content': userContent },
            ]
        });

        // parsing recommendations from openai
        const recommendations = JSON.parse(response.choices[0].message.content!);
        if (recommendations) {
            for (const rec of recommendations) {
                // using recommendations' image query to call to bing for image urls
                let url = await fetchImageThumbnail(rec.imageSearchQuery, process.env.BING_API_KEY!);
                rec['imgSrc'] = url;
            }
            return res.status(200).json({ recommendations, message: 'Gift recommendations generated' });
        } else {
            return res.status(500);
        }
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function favoriteGift(req: Request & IExtReq, res: Response) {
    try {
        const { title, reason, imgSrc, imageSearchQuery } = req.body;
        const friendId = req.params.id;
        const friend = await Friend.findById(friendId);
        if (!friend) throw { status: 404, message: "Friend not found" };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: "User not authorized for this request" }
        if (!title || !reason || !imgSrc || !imageSearchQuery) throw { status: 400, message: "Missing information" };
        const recommendation = await GiftRecommendation.create({
            title,
            reason,
            image: imgSrc,
            imageSearchQuery,
            friend: friend._id
        });
        res.status(201).json({ recommendation });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function removeFavorite(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        const favoriteId = req.params.favoriteId
        const friend = await Friend.findById(friendId);
        if (!friend) throw { status: 404, message: "Friend not found" };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: "User not authorized for this request" }
        const favorite = await GiftRecommendation.findById(favoriteId);
        if (!favorite) throw { status: 404, message: "Gift not found" };
        await favorite.deleteOne();
        res.status(200).json({ message: "Favorite gift removed" });
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

export async function getFavoritesOfFriend(req: Request & IExtReq, res: Response) {
    try {
        const friendId = req.params.id;
        const friend = await Friend.findById(friendId);
        if (!friend) throw { status: 404, message: "Friend not found" };
        if (friend?.user.toString() !== req.user?.toString()) throw { status: 403, message: "User not authorized for this request" }
        const favorites = await GiftRecommendation.find({ friend: friend._id });
        res.status(200).json({favorites});
    } catch (error: any) {
        if ('status' in error && 'message' in error) {
            sendError(res, error as HTTPError);
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
}