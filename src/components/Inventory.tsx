import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Item, Wardrobe } from '../types/database';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { BatchUpload } from './BatchUpload';
import { Trash2, MapPin, PackagePlus } from 'lucide-react';

export function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>([]);
  const [activeWardrobeId, setActiveWardrobeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [showWardrobeForm, setShowWardrobeForm] = useState(false);
  
  const [newWardrobeName, setNewWardrobeName] = useState('');
  const [newWardrobeCity, setNewWardrobeCity] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [itemsRes, wardrobesRes] = await Promise.all([
        supabase.from('items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('wardrobes').select('*').eq('user_id', user.id).order('name')
      ]);
      
      const fetchedWardrobes = wardrobesRes.data || [];
      setItems(itemsRes.data || []);
      setWardrobes(fetchedWardrobes);

      // Default to last used or first wardrobe
      const lastId = localStorage.getItem('last_wardrobe_id');
      if (lastId && fetchedWardrobes.some(w => w.id === lastId)) {
        setActiveWardrobeId(lastId);
      } else if (fetchedWardrobes.length > 0) {
        setActiveWardrobeId(fetchedWardrobes[0].id);
      }
    }
    setLoading(false);
  }

  const handleWardrobeSelect = (id: string) => {
    setActiveWardrobeId(id);
    localStorage.setItem('last_wardrobe_id', id);
  };

  async function handleAddWardrobe(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('wardrobes').insert({
      user_id: user.id,
      name: newWardrobeName,
      default_city: newWardrobeCity
    });

    if (error) alert(error.message);
    else {
      setNewWardrobeName('');
      setNewWardrobeCity('');
      setShowWardrobeForm(false);
      fetchData();
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questo capo?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  }

  const activeWardrobe = wardrobes.find(w => w.id === activeWardrobeId);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Wardrobe Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowWardrobeForm(!showWardrobeForm)}>
            <MapPin className="mr-2 h-4 w-4" /> New Wardrobe
          </Button>
          <Button onClick={() => setShowBatchUpload(!showBatchUpload)} disabled={!activeWardrobeId}>
            <PackagePlus className="mr-2 h-4 w-4" /> {showBatchUpload ? 'Close Upload' : 'Batch Upload'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2 text-zinc-500 italic">
          Select wardrobe to manage:
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {wardrobes.map(w => (
            <Button 
              key={w.id} 
              variant={activeWardrobeId === w.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleWardrobeSelect(w.id)}
            >
              {w.name}
            </Button>
          ))}
        </div>
      </div>

      {showWardrobeForm && (
        <Card>
          <CardHeader><CardTitle>Create New Wardrobe</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddWardrobe} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name (e.g. Milan Home)" value={newWardrobeName} onChange={e => setNewWardrobeName(e.target.value)} required />
                <Input placeholder="Default City" value={newWardrobeCity} onChange={e => setNewWardrobeCity(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Save Wardrobe</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showBatchUpload && activeWardrobe && (
        <div className="relative">
          <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-t-lg border-x border-t border-zinc-200 dark:border-zinc-800 text-sm font-bold flex items-center gap-2">
            <PackagePlus className="h-4 w-4" /> Uploading to: <span className="text-zinc-500 underline">{activeWardrobe.name}</span>
          </div>
          <BatchUpload activeWardrobeId={activeWardrobeId} />
          <div className="mt-4 flex justify-center">
             <Button variant="ghost" size="sm" onClick={fetchData}>Refresh List After Upload</Button>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {activeWardrobe ? `Items in ${activeWardrobe.name}` : 'All Items'}
        </h3>
        
        {loading ? <p className="text-center">Loading closet...</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items
              .filter(item => !activeWardrobeId || item.wardrobe_ids?.includes(activeWardrobeId))
              .map((item) => (
                <div key={item.id} className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <img src={item.image_url} alt={item.description} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <Button variant="danger" size="icon" className="rounded-full" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 p-1 text-[8px] flex flex-col uppercase tracking-tighter">
                    <div className="flex justify-between"><span>{item.category}</span><span>W:{item.warmth_score} E:{item.elegance_score}</span></div>
                    <div className="text-zinc-500 truncate">{item.wardrobe_ids?.map(id => wardrobes.find(w => w.id === id)?.name).join(', ')}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
