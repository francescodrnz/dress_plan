import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { AISync } from './components/AISync';
import { Button } from './components/ui/Button';
import { LayoutDashboard, ShoppingBag, LogOut, RefreshCw } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'inventory' | 'sync'>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tighter">DRESS PLAN</h1>
          <div className="flex gap-1 sm:gap-2">
            <Button variant={view === 'dashboard' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('dashboard')}>
              <LayoutDashboard className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button variant={view === 'inventory' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('inventory')}>
              <ShoppingBag className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Wardrobe</span>
            </Button>
            <Button variant={view === 'sync' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('sync')}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">AI Sync</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full pb-20">
        {view === 'dashboard' && <Dashboard />}
        {view === 'inventory' && <Inventory />}
        {view === 'sync' && <AISync />}
      </main>
      
      {/* Mobile Bottom Nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-around p-2 z-20">
            <Button variant={view === 'dashboard' ? 'secondary' : 'ghost'} className="flex-col gap-1 h-auto py-2" onClick={() => setView('dashboard')}>
              <LayoutDashboard className="h-5 w-5" /><span className="text-[10px]">Home</span>
            </Button>
            <Button variant={view === 'inventory' ? 'secondary' : 'ghost'} className="flex-col gap-1 h-auto py-2" onClick={() => setView('inventory')}>
              <ShoppingBag className="h-5 w-5" /><span className="text-[10px]">Wardrobe</span>
            </Button>
            <Button variant={view === 'sync' ? 'secondary' : 'ghost'} className="flex-col gap-1 h-auto py-2" onClick={() => setView('sync')}>
              <RefreshCw className="h-5 w-5" /><span className="text-[10px]">Sync</span>
            </Button>
      </div>
    </div>
  );
}

export default App;
