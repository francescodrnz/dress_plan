import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Item } from '../types/database';
import { calculateTargetWarmth, generateOutfits } from '../lib/selectionLogic';
import type { ActivityLevel } from '../lib/selectionLogic';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Slider } from './ui/Slider';
import { Wind, Thermometer, Check } from 'lucide-react';

export function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; wind: number; city: string } | null>(null);
  const [city, setCity] = useState('London');
  const [activity, setActivity] = useState<ActivityLevel>('moving');
  const [elegance, setElegance] = useState(50);
  const [outfits, setOutfits] = useState<Item[][]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('items').select('*').eq('user_id', user.id);
      setItems(data || []);
    }
  }

  async function fetchWeather() {
    setLoading(true);
    try {
      // 1. Geocoding: Get coordinates from city name
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
      }
      
      const { latitude, longitude, name } = geoData.results[0];

      // 2. Fetch Weather using coordinates
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&timezone=auto`);
      const weatherData = await weatherRes.json();
      
      setWeather({
        temp: Math.round(weatherData.current.temperature_2m),
        wind: Math.round(weatherData.current.wind_speed_10m),
        city: name
      });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    if (!weather) return;
    const targetWarmth = calculateTargetWarmth(weather.temp, weather.wind, activity);
    const generated = generateOutfits(items, targetWarmth, elegance);
    setOutfits(generated);
  }

  async function handleWear(outfit: Item[]) {
    const now = new Date().toISOString();
    const ids = outfit.map(i => i.id);
    
    const { error } = await supabase
      .from('items')
      .update({ last_used: now })
      .in('id', ids);
    
    if (error) alert(error.message);
    else {
      alert('Outfit marked as worn!');
      fetchItems(); // Refresh items to update last_used
    }
  }

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input 
              className="flex h-10 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Enter city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Button onClick={fetchWeather} disabled={loading}>
              {loading ? '...' : 'Fetch Weather'}
            </Button>
          </div>

          {weather && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <span>{weather.temp}°C</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-blue-500" />
                <span>{weather.wind} km/h</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Level</label>
            <div className="flex gap-2">
              {(['stationary', 'moving', 'indoor'] as ActivityLevel[]).map((a) => (
                <Button 
                  key={a}
                  variant={activity === a ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1 capitalize"
                  onClick={() => setActivity(a)}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>

          <Slider 
            label="Target Elegance" 
            min={0} max={100} 
            value={elegance} 
            onChange={(e) => setElegance(parseInt(e.target.value))}
          />

          <Button className="w-full" size="lg" onClick={handleGenerate} disabled={!weather}>
            Generate Outfits
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Recommendations</h3>
        {outfits.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No outfits generated yet. Check your criteria and wardrobe size.</p>
        ) : (
          <div className="space-y-6">
            {outfits.slice(0, 5).map((outfit, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {outfit.map((item) => (
                      <div key={item.id} className="min-w-[100px] aspect-[3/4] rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4" variant="outline" onClick={() => handleWear(outfit)}>
                    <Check className="mr-2 h-4 w-4" /> Wear This
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
