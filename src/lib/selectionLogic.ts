import type { Item } from '../types/database';

export type ActivityLevel = 'stationary' | 'moving' | 'indoor';

export function calculateTargetWarmth(temp: number, windSpeed: number, activity: ActivityLevel): number {
  // Simple mapping: 0°C -> 90 warmth, 30°C -> 10 warmth
  // y = mx + c
  // 90 = 0m + c -> c = 90
  // 10 = 30m + 90 -> 30m = -80 -> m = -8/3 ~= -2.67
  
  let target = 90 - (temp * 2.67);
  
  // Wind chill adjustment (rough approximation)
  target += windSpeed * 0.5;
  
  // Activity adjustment
  if (activity === 'stationary') target += 15;
  if (activity === 'moving') target -= 10;
  if (activity === 'indoor') target -= 25;

  return Math.min(Math.max(Math.round(target), 0), 100);
}

export function filterItems(
  items: Item[],
  targetWarmth: number,
  targetElegance: number,
  warmthTolerance: number = 15,
  eleganceTolerance: number = 10
): Item[] {
  return items.filter(item => {
    const warmthMatch = Math.abs(item.warmth_score - targetWarmth) <= warmthTolerance;
    const eleganceMatch = Math.abs(item.elegance_score - targetElegance) <= eleganceTolerance;
    return warmthMatch && eleganceMatch;
  });
}

export function generateOutfits(
  items: Item[],
  targetWarmth: number,
  targetElegance: number
): Item[][] {
  const filtered = filterItems(items, targetWarmth, targetElegance);
  
  // Group by category
  const categories: Record<string, Item[]> = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  // Sort each category by last_used (ASC)
  Object.values(categories).forEach(catItems => {
    catItems.sort((a, b) => {
      const dateA = a.last_used ? new Date(a.last_used).getTime() : 0;
      const dateB = b.last_used ? new Date(b.last_used).getTime() : 0;
      return dateA - dateB;
    });
  });

  // Basic outfit generation: 1 top, 1 bottom, 1 shoes.
  // Add outerwear if warmth is high.
  // Add base_layer if warmth is very high.
  
  const outfits: Item[][] = [];
  
  const tops = categories['top'] || [];
  const bottoms = categories['bottom'] || [];
  const shoes = categories['shoes'] || [];
  
  // Just a simple cartesian product for now, limited to first few
  for (const top of tops.slice(0, 3)) {
    for (const bottom of bottoms.slice(0, 3)) {
      for (const shoe of shoes.slice(0, 3)) {
        const outfit: Item[] = [top, bottom, shoe];
        
        // Optionally add accessories or outerwear
        if (targetWarmth > 60 && categories['outerwear']?.length) {
          outfit.push(categories['outerwear'][0]);
        }
        
        outfits.push(outfit);
      }
    }
  }

  return outfits;
}
