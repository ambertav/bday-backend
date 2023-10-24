/** Simple sliding-window rate limiter */
export class SlidingWindowRateLimiter {

    private maxRequests: number;
    private timeWindow: number;
    private timestamps: Record<string, number[]>;

    constructor(maxRequests = 10, timeWindow = 60000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.timestamps = {}
    }

    isRateLimited(id: string): boolean {
        const now = Date.now();
        if (!this.timestamps[id]) {
            this.timestamps[id] = [];
        }

        const timestamps = this.timestamps[id];
        while (timestamps.length && timestamps[0] <= now - this.timeWindow) {
            timestamps.shift();
        }

        if (timestamps.length >= this.maxRequests) {
            return true;
        }
        timestamps.push(now);
        return false;
    }
}