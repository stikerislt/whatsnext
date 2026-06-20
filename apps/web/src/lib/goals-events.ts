export const GOALS_UPDATED_EVENT = 'wn:goals-updated';

export function notifyGoalsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GOALS_UPDATED_EVENT));
  }
}
