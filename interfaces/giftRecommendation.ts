export interface IGiftRecommendationRequest{
    budget?: number;
    tags?: string[]; // ObjectIds
    giftTypes?: string[]; // strings, known to backend (../utilities/constants.ts)
}