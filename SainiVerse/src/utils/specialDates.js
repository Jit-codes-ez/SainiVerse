/**
 * Special Dates Configuration for SainiVerse
 * Supporting dual perspectives: Intimate dedicated love for her + Welcoming celebration for friends & guests.
 * Month is 1-indexed (1 = January, 10 = October, etc.)
 */
export const HER_BIRTHDAY = {
  month: 5,
  day: 20,
  birthYear: 2003,
  image: '/SainiVerseLogo.png',
  badge: 'Her Special Day 🎂',
  forHer: {
    heading: 'Happy Birthday to My Queen,',
    name: 'Saini Paul',
    emoji: '🎂 🌸 ✨ 💖',
    subtitle: 'Celebrating the most radiant soul in my entire universe',
    message:
      'Happy Birthday to the one who makes every single sunrise sweeter and my whole world full of laughter. Thank you for being my favorite person, my best friend, and my greatest blessing. May all your dreams blossom today and forever!',
    buttonText: 'Enter Our Birthday Celebration 🌸',
  },
  forGuests: {
    heading: 'Today is Her Birthday,',
    name: 'Saini Paul',
    emoji: '🎂 🎉 ✨ 💖',
    subtitle: 'Celebrating the most wonderful person in the world',
    message:
      'Today is a very special milestone—it’s her birthday! She brings so much sunshine, kindness, and beauty to everyone around her. Join us in celebrating her and sending her all our sweetest wishes!',
    buttonText: 'Celebrate Her & Step In 🥂',
  },
};

export const OUR_ANNIVERSARY = {
  month: 9,
  day: 24,
  image: '/SainiVerseLogo.png',
  badge: 'Our Anniversary Milestone 💍',
  forHer: {
    heading: 'Happy Anniversary, My Beloved,',
    name: 'Saini Paul',
    emoji: '🥂 🌹 💖 💍',
    subtitle: 'Another chapter in our eternal and beautiful love story',
    message:
      'Every day by your side feels like a dream I never want to wake up from. From our very first glance to this exact breath, you have been my greatest adventure and sweetest peace. Happy Anniversary, my heart!',
    buttonText: 'Step Into Our Anniversary Sanctuary 🌹',
  },
  forGuests: {
    heading: 'Celebrating Our Anniversary,',
    name: 'Saini Paul',
    emoji: '🥂 🌹 💖 ✨',
    subtitle: 'Another year of love, memories, and shared dreams',
    message:
      'Today marks another milestone in our journey together. Thank you for walking alongside us, sharing in our joy, and blessing our love story with your presence!',
    buttonText: 'Explore Our Journey 🌹',
  },
};


/**
 * Checks if a given date matches Her Birthday or Their Anniversary.
 * Also checks URL query parameters (?occasion=birthday or ?occasion=anniversary)
 *
 * @param {Date} [targetDate=new Date()]
 * @returns {'birthday' | 'anniversary' | null}
 */
export function checkSpecialOccasion(targetDate = new Date()) {
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    const testOccasion = params.get('occasion')?.toLowerCase();
    if (testOccasion === 'birthday' || testOccasion === 'bday') return 'birthday';
    if (testOccasion === 'anniversary' || testOccasion === 'anni') return 'anniversary';
  }

  const currentMonth = targetDate.getMonth() + 1;
  const currentDay = targetDate.getDate();

  if (currentMonth === HER_BIRTHDAY.month && currentDay === HER_BIRTHDAY.day) {
    return 'birthday';
  }

  // Celebrates Anniversary window (September 22 & 23, or exact configured anniversary day)
  if (
    (currentMonth === 9 && (currentDay === 20 || currentDay === 24)) ||
    (currentMonth === OUR_ANNIVERSARY.month && (currentDay === OUR_ANNIVERSARY.day || OUR_ANNIVERSARY.days?.includes(currentDay)))
  ) {
    return 'anniversary';
  }

  return null;
}
