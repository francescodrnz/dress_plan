export type Category = 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'base_layer';

export interface Item {
  id: string;
  user_id: string;
  image_url: string;
  category: Category;
  warmth_score: number; // 0-100
  elegance_score: number; // 0-100
  description?: string;
  last_used?: string; // ISO timestamp
  created_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  items_included: string[]; // array of item_ids
  created_at: string;
}
