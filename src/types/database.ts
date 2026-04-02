export type Category = 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'base_layer';

export interface Wardrobe {
  id: string;
  user_id: string;
  name: string;
  default_city?: string;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  image_url: string;
  category: Category;
  warmth_score: number;
  elegance_score: number;
  description?: string;
  last_used?: string;
  created_at: string;
  wardrobe_ids: string[]; // Array of wardrobe IDs
}

export interface Outfit {
  id: string;
  user_id: string;
  items_included: string[]; // array of item_ids
  created_at: string;
}
