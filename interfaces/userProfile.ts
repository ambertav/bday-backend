export interface IUserProfileDetails {
    interests?: string[];
    bio?: string;
    dob?: Date;
    gender?: string;
    tel?: number;
    location?: string;
    name?: string;
    timezone?: string;
    notificationSchedule?: number[];
    emailNotifications?: boolean;
    pushNotifications?: boolean;
}