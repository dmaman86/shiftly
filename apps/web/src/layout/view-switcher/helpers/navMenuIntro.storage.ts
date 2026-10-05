// localStorage (not sessionStorage): the menu should introduce the other pages
// once per browser, not on every new tab.
export const NAV_MENU_INTRO_KEY = "shiftly:nav-menu-intro-seen";

const safely = <T>(operation: () => T, fallback: T): T => {
  try {
    return operation();
  } catch (error) {
    console.warn("Navigation menu storage is unavailable", error);
    return fallback;
  }
};

export const navMenuIntroStorage = {
  // Unreadable storage counts as seen: reopening the menu on every load would
  // be worse than never introducing it.
  hasSeen: () => safely(() => localStorage.getItem(NAV_MENU_INTRO_KEY) !== null, true),
  markSeen: () => safely(() => localStorage.setItem(NAV_MENU_INTRO_KEY, "1"), undefined),
};
