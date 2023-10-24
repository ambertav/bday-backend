import { Response } from "express";

export function toSeconds(timeString:string){
    const validUnits = ['s', 'm', 'h', 'd', 'w'];
    const unit = timeString.substring(timeString.length - 1);

    if (!validUnits.includes(unit)) throw new Error('Invalid time unit');

    const num = Number(timeString.substring(0, timeString.length - 1));

    if (isNaN(num)) {
        throw new Error('Invalid number in time string');
    }

    // convert time unit to seconds
    switch (unit) {
        case 's':
            return num;
        case 'm':
            return num * 60;
        case 'h':
            return num * 3600;
        case 'd':
            return num * 86400;
        case 'w':
            return num * 604800;
    }
}



export type HTTPError = { status: number, message: string };

export function sendError(res: Response, { status, message }: HTTPError) {
    res.status(status).json({ message });
}