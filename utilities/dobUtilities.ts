import { IFriendDocument } from '../modules/friends/models/friend';

interface IFriendResult extends IFriendDocument {
    daysUntilBirthday: number,
    cardColor: string,
}

export function formatFriendsData (friends : IFriendResult[]) {
    const result = {
        today: [] as IFriendResult[],
        thisWeek: [] as IFriendResult[],
        thisMonth: [] as IFriendResult[],
        laterOn: [] as IFriendResult[],
    }

    friends.forEach((friend, index) => {
        const colorIndex = index % presentlyCardColors.length;
        friend['cardColor'] = presentlyCardColors[colorIndex];
        
        if (friend.daysUntilBirthday === 0) result.today.push(friend);
        else if (friend.daysUntilBirthday <= 31) {
            const category = categorizeBirthday(friend.dob);
            if (category === 'thisWeek' || category === 'thisMonth') result[category].push(friend);
        }
        else result.laterOn.push(friend);
    });
    return result;
}

function categorizeBirthday (dob : Date) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
  
    const birthdayDate = new Date(dob);
    const birthdayMonth = birthdayDate.getMonth() + 1;
    const birthdayDay = birthdayDate.getDate();
  
    // calculate start and end dates of calendar week
    const currentWeekStartDate = new Date(currentDate);
    currentWeekStartDate.setDate(currentDate.getDate() - currentDate.getDay());
    const currentWeekEndDate = new Date(currentWeekStartDate);
    currentWeekEndDate.setDate(currentWeekStartDate.getDate() + 6);
  
    // check if dob falls within calendar week
    if (
      (birthdayMonth === currentMonth && birthdayDay >= currentWeekStartDate.getDate() && birthdayDay <= currentWeekEndDate.getDate()) ||
      (birthdayDate >= currentWeekStartDate && birthdayDate <= currentWeekEndDate)
    ) return 'thisWeek'; // if yes, return week category
    else if (currentMonth === birthdayMonth) return 'thisMonth'; // if no, return month category
}

  const presentlyCardColors : string[] = [
    "#418BFA",
    "#f63517",
    "#FE6797",
    "#FA7F39",
    "#AF95E7",
    "#EDB600",
    "#8cb2c9",
    "#53CF85",
  ];