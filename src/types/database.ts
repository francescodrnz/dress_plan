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
  color?: string;
  pattern?: string;
  style_tags: string[];
  last_used?: string;
  created_at: string;
  wardrobe_ids: string[];
}

export interface Outfit {
  id: string;
  user_id: string;
  wardrobe_id?: string;
  item_ids: string[]; // UUID array
  total_warmth: number;
  avg_elegance: number;
  style_coherence?: string;
  created_at: string;
}
