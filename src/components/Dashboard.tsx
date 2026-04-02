import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Item, Wardrobe, Outfit } from '../types/database';
import { calculateTargetWarmth } from '../lib/selectionLogic';
import type { ActivityLevel } from '../lib/selectionLogic';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Slider } from './ui/Slider';
import { Wind, Thermometer, Check, MapPin } from 'lucide-react';

export function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [wardrobes, setWardrobes] = useState<Wardrobe[]>([]);
  const [activeWardrobe, setActiveWardrobe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; wind: number; city: string } | null>(null);
  const [city, setCity] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moving');
  const [elegance, setElegance] = useState(50);
  const [recommendedOutfits, setRecommendedOutfits] = useState<Outfit[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [itemsRes, wardrobesRes] = await Promise.all([
        supabase.from('items').select('*').eq('user_id', user.id),
        supabase.from('wardrobes').select('*').eq('user_id', user.id).order('name')
      ]);
      
      const fetchedWardrobes = wardrobesRes.data || [];
      setItems(itemsRes.data || []);
      setWardrobes(fetchedWardrobes);
      
      const lastId = localStorage.getItem('last_wardrobe_id');
      const savedWardrobe = fetchedWardrobes.find(w => w.id === lastId) || fetchedWardrobes[0];
      
      if (savedWardrobe) {
        handleWardrobeSelect(savedWardrobe);
      }
    }
  }

  function handleWardrobeSelect(w: Wardrobe) {
    setActiveWardrobe(w.id);
    localStorage.setItem('last_wardrobe_id', w.id);
    if (w.default_city) {
      setCity(w.default_city);
    }
    setRecommendedOutfits([]);
    setWeather(null);
  }

  async function fetchWeather() {
    if (!city) return;
    setLoading(true);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results) throw new Error('City not found');
      const { latitude, longitude, name } = geoData.results[0];
      
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&timezone=auto`);
      const weatherData = await weatherRes.json();
      
      setWeather({
        temp: Math.round(weatherData.current.temperature_2m),
        wind: Math.round(weatherData.current.wind_speed_10m),
        city: name
      });

      if (activeWardrobe) {
        await supabase
          .from('wardrobes')
          .update({ default_city: name })
          .eq('id', activeWardrobe);
          
        setWardrobes(prev => prev.map(w => w.id === activeWardrobe ? { ...w, default_city: name } : w));
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecommendedOutfits(targetW: number, targetE: number) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activeWardrobe) return;

    const { data } = await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)
      .eq('wardrobe_id', activeWardrobe)
      .gte('total_warmth', targetW - 15)
      .lte('total_warmth', targetW + 15)
      .gte('avg_elegance', targetE - 20)
      .lte('avg_elegance', targetE + 20);

    setRecommendedOutfits(data || []);
    setLoading(false);
  }

  function handleGenerate() {
    if (!weather || !activeWardrobe) return;
    const targetWarmth = calculateTargetWarmth(weather.temp, weather.wind, activity);
    fetchRecommendedOutfits(targetWarmth, elegance);
  }

  async function handleWear(outfit: Outfit) {
    const now = new Date().toISOString();
    const { error } = await supabase.from('items').update({ last_used: now }).in('id', outfit.item_ids);
    if (error) alert(error.message);
    else {
      alert('Outfit marked as worn!');
      fetchData();
    }
  }

  const renderOutfitItems = (itemIds: string[]) => {
    const outfitItems = items.filter(i => itemIds.includes(i.id));
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {outfitItems.map((item) => (
          <div key={item.id} className="min-w-[100px] aspect-[3/4] rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Select Wardrobe</label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {wardrobes.map(w => (
            <Button 
              key={w.id} 
              variant={activeWardrobe === w.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleWardrobeSelect(w)}
            >
              {w.name}
            </Button>
          ))}
          {wardrobes.length === 0 && <p className="text-sm text-zinc-500">No wardrobes created. Go to Wardrobe tab.</p>}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input 
              className="flex h-10 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Enter city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Button onClick={fetchWeather} disabled={loading || !city}>
              {loading ? '...' : 'Update Weather'}
            </Button>
          </div>

          {weather && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-2"><Wind className="h-5 w-5 text-blue-500" /><span>{weather.wind} km/h</span></div>
              <div className="flex items-center gap-2"><Thermometer className="h-5 w-5 text-orange-500" /><span>{weather.temp}°C</span></div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Level</label>
            <div className="flex gap-2">
              {(['stationary', 'moving', 'indoor'] as ActivityLevel[]).map((a) => (
                <Button key={a} variant={activity === a ? 'primary' : 'outline'} size="sm" className="flex-1 capitalize" onClick={() => setActivity(a)}>{a}</Button>
              ))}
            </div>
          </div>

          <Slider label="Target Elegance" min={0} max={100} value={elegance} onChange={(e) => setElegance(parseInt(e.target.value))} />

          <Button className="w-full" size="lg" onClick={handleGenerate} disabled={!weather || !activeWardrobe}>
            Generate Outfits
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Recommendations</h3>
        {recommendedOutfits.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No outfits found. Make sure you have synced outfits from AI.</p>
        ) : (
          <div className="space-y-6">
            {recommendedOutfits.slice(0, 5).map((outfit, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  {renderOutfitItems(outfit.item_ids)}
                  <Button className="w-full mt-4" variant="outline" onClick={() => handleWear(outfit)}><Check className="mr-2 h-4 w-4" /> Wear This</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
