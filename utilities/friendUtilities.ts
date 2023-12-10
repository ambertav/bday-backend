import moment from 'moment-timezone';
import { IFriendResult } from '../modules/friends/models/friend';

export function formatFriendsData(friends: IFriendResult[]) {
    const result = {
        today: [] as IFriendResult[],
        thisWeek: [] as IFriendResult[],
        thisMonth: [] as IFriendResult[],
        laterOn: [] as IFriendResult[],
    }

    friends.forEach((friend, index) => {
        // randomly assign card color
        const colorIndex = index % presentlyCardColors.length;
        friend['cardColor'] = presentlyCardColors[colorIndex];

        if (friend.daysUntilBirthday === 0) result.today.push(friend);
        else if (friend.daysUntilBirthday <= 31) {
            const category = categorizeBirthday(friend.dob); // determines if the birthday lands in calendar week or just calendar month
            if (category === 'thisWeek' || category === 'thisMonth') result[category].push(friend); // pushes according to return
        } else result.laterOn.push(friend);
    });
    return result;
}

function categorizeBirthday(dob : Date) {
    const currentDate = moment();
    const currentMonth = currentDate.month() + 1;

    const birthdayDate = moment(dob);
    birthdayDate.year(currentDate.year());
    const birthdayMonth = birthdayDate.month() + 1;

    // check if the birthday falls within the current week
    const isThisWeek = birthdayDate.isSame(currentDate, 'week');

    if (isThisWeek) return 'thisWeek'; // if yes, return week category
    else if (currentMonth === birthdayMonth) return 'thisMonth'; // if no, return month category
}

export function daysUntilBirthday(dob: Date, timezone: string) {
    // convert dob to string to parse
    const dobString = dob.toISOString().slice(0, 10);

    // find birthday and current
    const birthday = moment.tz(dobString, 'YYYY-MM-DD', timezone);
    const now = moment.tz(timezone);

    birthday.year(now.year()); // set birthday to this year
    birthday.set({ hour: 23, minute: 59, second: 59, millisecond: 999 }); // set birthday time to just before the next day

    // if the birthday passed, add 1 to the year
    if (now.isAfter(birthday)) birthday.add(1, 'year'); // add 1 to the year

    // calculate difference between now and birthday,
    const daysUntilBirthday = birthday.diff(now, 'days');

    return daysUntilBirthday;
}

const presentlyCardColors: string[] = [
    "#418BFA",
    "#f63517",
    "#FE6797",
    "#FA7F39",
    "#AF95E7",
    "#EDB600",
    "#8cb2c9",
    "#53CF85",
];