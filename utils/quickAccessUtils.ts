import { LinkItem } from '../types';

/**
 * Sorts quick access items descending by click count (most clicked first).
 * In case of ties with clickCount > 0, the most recently clicked comes first.
 * Items with 0 clicks maintain their original relative order at the bottom.
 */
export function sortQuickAccessByUsage(items: LinkItem[]): LinkItem[] {
  if (!Array.isArray(items)) return [];

  // Tag each item with its original index to guarantee a stable sort for items with equal/no clicks
  const indexed = items.map((item, index) => ({ item, index }));

  indexed.sort((a, b) => {
    const countA = a.item.clickCount || 0;
    const countB = b.item.clickCount || 0;

    if (countB !== countA) {
      return countB - countA;
    }

    if (countA > 0 && countB > 0) {
      const timeA = a.item.lastClicked || 0;
      const timeB = b.item.lastClicked || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
    }

    return a.index - b.index;
  });

  return indexed.map(entry => entry.item);
}

/**
 * Records a click on a quick access item, incrementing its click counter
 * and re-sorting the list by usage so the most used items float to the top.
 */
export function recordQuickAccessClick(items: LinkItem[], id: string): LinkItem[] {
  if (!Array.isArray(items)) return [];

  const updated = items.map(item => {
    if (item.id === id) {
      return {
        ...item,
        clickCount: (item.clickCount || 0) + 1,
        lastClicked: Date.now()
      };
    }
    return item;
  });

  return sortQuickAccessByUsage(updated);
}

/**
 * Resets click counters for all quick access items while keeping items intact.
 */
export function resetQuickAccessCounters(items: LinkItem[]): LinkItem[] {
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    ...item,
    clickCount: 0,
    lastClicked: undefined
  }));
}
