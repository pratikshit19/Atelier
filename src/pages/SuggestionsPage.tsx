import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, cn } from '../components/ui';
import { Sparkles, RefreshCw, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface Item {
  id: string;
  name: string;
  category: string;
  image_url: string;
  color: string;
}

interface Outfit {
  top: Item;
  bottom: Item;
  shoes: Item;
}

export const SuggestionsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [combinations, setCombinations] = useState<Outfit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [user]);

  const generateSuggestions = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data: items, error } = await supabase
        .from('items')
        .select('*');

      if (error) throw error;

      if (!items || items.length === 0) {
        setCombinations([]);
        return;
      }

      const tops = items.filter(i => i.category === 'Tops');
      const bottoms = items.filter(i => i.category === 'Bottoms');
      const shoes = items.filter(i => i.category === 'Shoes');

      if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
        setCombinations([]);
        return;
      }

      // Generate a few random combinations
      const combos: Outfit[] = [];
      const numToGenerate = Math.min(5, tops.length * bottoms.length * shoes.length);

      const usedIndices = new Set<string>();

      while (combos.length < numToGenerate) {
        const t = tops[Math.floor(Math.random() * tops.length)];
        const b = bottoms[Math.floor(Math.random() * bottoms.length)];
        const s = shoes[Math.floor(Math.random() * shoes.length)];

        const key = `${t.id}-${b.id}-${s.id}`;
        if (!usedIndices.has(key)) {
          combos.push({ top: t, bottom: b, shoes: s });
          usedIndices.add(key);
        }

        // Safety break
        if (usedIndices.size >= tops.length * bottoms.length * shoes.length) break;
      }

      setCombinations(combos);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const logWear = async (outfit: Outfit) => {
    if (!user) return;
    try {
      const itemsToLog = [outfit.top.id, outfit.bottom.id, outfit.shoes.id].map(id => ({
        user_id: user.id,
        item_id: id,
        worn_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('wear_logs').insert(itemsToLog);
      if (error) throw error;

      toast.success('Wear logged! Your analytics have been updated.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const saveOutfit = async (outfit: Outfit) => {
    if (!user) return;
    try {
      // 1. Create Outfit
      const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .insert([{
          user_id: user.id,
          name: `Combo ${new Date().toLocaleDateString()}`,
          is_favorite: true
        }])
        .select()
        .single();

      if (outfitError) throw outfitError;

      // 2. Add Items to Junction Table
      const itemsToInsert = [
        { outfit_id: outfitData.id, item_id: outfit.top.id },
        { outfit_id: outfitData.id, item_id: outfit.bottom.id },
        { outfit_id: outfitData.id, item_id: outfit.shoes.id },
      ];

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Outfit saved to your collection!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Sparkles className="w-12 h-12 animate-pulse text-primary" />
        <p className="text-muted-foreground">Generating smart combos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Smart Combos</h1>
          <p className="text-muted-foreground mt-1">AI-suggested outfits based on your current closet.</p>
        </div>
        <Button onClick={generateSuggestions} disabled={refreshing} variant="outline" className="gap-2">
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          <span>New Suggestions</span>
        </Button>
      </div>

      {combinations.length === 0 ? (
        <div className="text-center py-32 border border-border/30 bg-secondary/5 rounded-xl">
          <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-6" />
          <h3 className="text-lg font-medium">Incomplete Closet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
            Upload at least one item in <strong>Tops, Bottoms, and Shoes</strong> to generate combos.
          </p>
          <Button variant="outline" className="mt-8 rounded-none px-8" onClick={() => window.location.href = '/closet'}>
            Go to Closet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {combinations.map((outfit, idx) => (
            <div key={idx} className="p-8 rounded-[1.25rem] bg-card border border-white/5 space-y-6 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary">Variation {idx + 1}</span>
                <div className="flex items-center gap-6">
                  <button
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors inline-flex items-center gap-2"
                    onClick={() => logWear(outfit)}
                  >
                    <RefreshCw size={12} />
                    Wear Today
                  </button>
                  <button
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                    onClick={() => saveOutfit(outfit)}
                  >
                    <Heart size={12} />
                    Archive Look
                  </button>
                </div>
              </div>

              <div className="flex -space-x-20 hover:-space-x-10 transition-all duration-700 py-10 justify-center">
                {[outfit.top, outfit.bottom, outfit.shoes].map((item, i) => (
                  <div
                    key={item.id}
                    className="w-48 h-64 bg-muted rounded-[2rem] overflow-hidden border-4 border-[#18181b] shadow-2xl relative transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2"
                    style={{ zIndex: 10 - i, transform: `rotate(${(i - 1) * 1.5}deg)` }}
                  >
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                      {['Top', 'Bottom', 'Shoes'][i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

