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
      
      setItems(itemsRes.data || []);
      setWardrobes(wardrobesRes.data || []);
    }
    setLoading(false);
  }

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

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Manage</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowWardrobeForm(!showWardrobeForm)}>
            <MapPin className="mr-2 h-4 w-4" /> New Wardrobe
          </Button>
          <Button onClick={() => setShowBatchUpload(!showBatchUpload)}>
            <PackagePlus className="mr-2 h-4 w-4" /> {showBatchUpload ? 'Close Batch' : 'Batch Upload'}
          </Button>
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

      {showBatchUpload && (
        <div className="relative">
          <BatchUpload />
          <div className="mt-4 flex justify-center">
             <Button variant="ghost" size="sm" onClick={fetchData}>Refresh Wardrobe List</Button>
          </div>
        </div>
      )}

      {loading ? <p className="text-center">Loading closet...</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
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
  );
}
