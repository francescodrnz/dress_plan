import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Clipboard, RefreshCw } from 'lucide-react';

export function AISync({ activeWardrobeId }: { activeWardrobeId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [importJson, setImportJson] = useState('');

  const exportWardrobe = async () => {
    if (!activeWardrobeId) {
      alert('Seleziona prima un armadio.');
      return;
    }
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: items } = await supabase
      .from('items')
      .select('id, category, warmth_score, elegance_score, description, color, pattern, style_tags')
      .eq('user_id', user.id)
      .contains('wardrobe_ids', [activeWardrobeId]);
    
    const minimized = (items || []).map(i => ({
      id: i.id,
      cat: i.category,
      w: i.warmth_score,
      e: i.elegance_score,
      desc: i.description,
      col: i.color,
      pat: i.pattern,
      tags: i.style_tags
    }));

    navigator.clipboard.writeText(JSON.stringify(minimized));
    alert('Wardrobe exported to clipboard! Paste it into your LLM.');
    setLoading(false);
  };

  const importOutfits = async () => {
    if (!activeWardrobeId) {
      alert('Seleziona prima un armadio.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const outfits = JSON.parse(importJson);
      if (!Array.isArray(outfits)) throw new Error('Invalid JSON format');

      // 1. Delete old outfits for THIS wardrobe
      await supabase.from('outfits').delete().eq('user_id', user.id).eq('wardrobe_id', activeWardrobeId);

      // 2. Prepare for bulk insert
      const toInsert = outfits.map(o => ({
        user_id: user.id,
        wardrobe_id: activeWardrobeId,
        item_ids: o.item_ids,
        total_warmth: o.total_warmth,
        avg_elegance: o.avg_elegance,
        style_coherence: o.style_coherence
      }));

      const { error } = await supabase.from('outfits').insert(toInsert);
      if (error) throw error;

      alert('Sync complete! New outfits imported.');
      setImportJson('');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI-Driven Sync</CardTitle>
          <CardDescription>Export items to an LLM and import generated outfits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={exportWardrobe} className="w-full" variant="outline" disabled={loading || !activeWardrobeId}>
            <Clipboard className="mr-2 h-4 w-4" /> Export Wardrobe
          </Button>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Incolla Outfits JSON</label>
            <textarea 
              className="w-full h-48 rounded-md border border-zinc-200 p-2 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-950"
              placeholder='[{"item_ids": ["uuid1", "uuid2"], "total_warmth": 80, "avg_elegance": 50}]'
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
          </div>

          <Button onClick={importOutfits} className="w-full" disabled={loading || !importJson || !activeWardrobeId}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Import & Sync
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
