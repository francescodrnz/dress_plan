import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Item, Category, Wardrobe } from '../types/database';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Slider } from './ui/Slider';
import { Plus, Trash2, Camera, MapPin, Check } from 'lucide-react';

export function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWardrobeForm, setShowWardrobeForm] = useState(false);
  
  // New wardrobe state
  const [newWardrobeName, setNewWardrobeName] = useState('');
  const [newWardrobeCity, setNewWardrobeCity] = useState('');

  // New item form state
  const [category, setCategory] = useState<Category>('top');
  const [warmth, setWarmth] = useState(50);
  const [elegance, setElegance] = useState(50);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedWardrobes, setSelectedWardrobes] = useState<string[]>([]);

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

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('items').insert({
        user_id: user.id,
        image_url: publicUrl,
        category,
        warmth_score: warmth,
        elegance_score: elegance,
        description,
        wardrobe_ids: selectedWardrobes,
        created_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      fetchData();
      setShowAddForm(false);
      resetForm();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setCategory('top');
    setWarmth(50);
    setElegance(50);
    setDescription('');
    setImageFile(null);
    setSelectedWardrobes([]);
  }

  function toggleWardrobeInForm(id: string) {
    setSelectedWardrobes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure?')) return;
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
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
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

      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>Add New Item</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 relative overflow-hidden h-48 bg-zinc-50 dark:bg-zinc-900">
                {imageFile ? (
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center"><Camera className="mx-auto h-12 w-12 text-zinc-400" /><span className="mt-2 block text-sm font-medium">Click to upload photo</span></div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImageFile(e.target.files?.[0] || null)} required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Wardrobes</label>
                <div className="flex flex-wrap gap-2">
                  {wardrobes.map(w => (
                    <Button 
                      key={w.id} 
                      type="button"
                      variant={selectedWardrobes.includes(w.id) ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => toggleWardrobeInForm(w.id)}
                    >
                      {selectedWardrobes.includes(w.id) && <Check className="mr-1 h-3 w-3" />}
                      {w.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                    <option value="top">Top</option><option value="bottom">Bottom</option><option value="shoes">Shoes</option><option value="accessory">Accessory</option><option value="outerwear">Outerwear</option><option value="base_layer">Base Layer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="e.g. Blue Jeans" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
              <Slider label="Warmth" min={0} max={100} value={warmth} onChange={(e) => setWarmth(parseInt(e.target.value))} />
              <Slider label="Elegance" min={0} max={100} value={elegance} onChange={(e) => setElegance(parseInt(e.target.value))} />
              <div className="flex gap-2"><Button className="flex-1" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Save Item'}</Button><Button variant="outline" type="button" onClick={() => setShowAddForm(false)}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
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
                <div className="text-zinc-500 truncate">{item.wardrobe_ids.map(id => wardrobes.find(w => w.id === id)?.name).join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
