export interface IUser {
    _id: string;
}

export interface IExtReq {
    user?: string | null;
}

export interface ILoginRequest{
    email: string;
    password: string;
}

export interface ILoginResponse{
    accessToken: string;
}

export interface IChangePasswordRequest{
    oldPassword: string;
    newPassword: string;
}

export interface ISignupRequest{
    email: string;
    password: string;
    name: string;
    dob: Date;
    gender: string;
    tel?: number;
    location?: string;
    timezone?: string;
}