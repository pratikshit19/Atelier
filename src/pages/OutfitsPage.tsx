import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { Layers, Trash2, Loader2, Edit2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface OutfitWithItems {
  id: string;
  name: string;
  created_at: string;
  items: {
    id: string;
    name: string;
    image_url: string;
    category: string;
  }[];
}

export const OutfitsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchOutfits();
  }, [user]);

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const { error } = await supabase
        .from('outfits')
        .update({ name: editingName })
        .eq('id', id);

      if (error) throw error;
      
      setOutfits(outfits.map(o => o.id === id ? { ...o, name: editingName } : o));
      setEditingId(null);
      toast.success('Outfit renamed');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchOutfits = async () => {
    if (!user) return;
    try {
      // Fetch outfits
      const { data: outfitsData, error: outfitsError } = await supabase
        .from('outfits')
        .select(`
          id,
          name,
          created_at,
          outfit_items (
            items (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (outfitsError) throw outfitsError;

      const formattedOutfits = outfitsData.map((o: any) => ({
        id: o.id,
        name: o.name,
        created_at: o.created_at,
        items: o.outfit_items.map((oi: any) => oi.items)
      }));

      setOutfits(formattedOutfits);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteOutfit = async (id: string) => {
    if (!confirm('Delete this outfit?')) return;
    try {
      const { error } = await supabase.from('outfits').delete().eq('id', id);
      if (error) throw error;
      setOutfits(outfits.filter(o => o.id !== id));
      toast.success('Outfit deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your collection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Saved Outfits</h1>
        <p className="text-muted-foreground mt-1">Your personal collection of curated combinations.</p>
      </div>

      {outfits.length === 0 ? (
        <div className="text-center py-32 border border-border/30 bg-secondary/5 rounded-xl">
          <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-6" />
          <h3 className="text-lg font-medium">No archived looks</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            Your saved combinations will appear here as a personal lookbook.
          </p>
          <Button variant="outline" className="mt-8 rounded-none px-8" onClick={() => window.location.href = '/suggestions'}>
            Explore Suggestions
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {outfits.map(outfit => (
            <div key={outfit.id} className="group p-6 rounded-[2.5rem] bg-secondary/20 border border-white/5 space-y-6 hover:bg-secondary/30 transition-all duration-500">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
                  {new Date(outfit.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <button 
                  onClick={() => deleteOutfit(outfit.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="flex -space-x-12 group-hover:-space-x-6 transition-all duration-500 py-4 justify-center">
                {outfit.items.map((item, i) => (
                  <div 
                    key={item.id} 
                    className="w-28 h-36 bg-muted rounded-2xl overflow-hidden border-2 border-card shadow-2xl relative transition-transform duration-500 group-hover:rotate-1"
                    style={{ zIndex: 10 - i, transform: `rotate(${(i - 1) * 2}deg)` }}
                  >
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="px-2">
                {editingId === outfit.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      className="bg-secondary/40 border border-white/10 rounded-lg px-3 py-1 text-sm font-medium w-full focus:outline-none focus:border-primary transition-all"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(outfit.id)}
                    />
                    <button 
                      onClick={() => handleRename(outfit.id)}
                      className="p-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-all"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group/title">
                    <h3 className="text-base font-semibold tracking-tight truncate">{outfit.name}</h3>
                    <button 
                      onClick={() => {
                        setEditingId(outfit.id);
                        setEditingName(outfit.name);
                      }}
                      className="opacity-0 group-hover/title:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-all"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 mt-2 opacity-60">
                  {outfit.items.slice(0, 3).map(item => (
                    <span key={item.id} className="text-[9px] uppercase tracking-widest">
                      {item.category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
