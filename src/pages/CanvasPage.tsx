import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, cn } from '../components/ui';
import { 
  Plus, 
  Trash2, 
  Save, 
  Maximize2, 
  RotateCcw,
  Layers,
  Search,
  ChevronRight,
  Palette,
  Sparkles,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { removeBackground } from '@imgly/background-removal';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';

interface CanvasItem {
  id: string;
  item_id: string;
  image_url: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export const CanvasPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]); // Closet items
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [outfitName, setOutfitName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isClosetOpen, setIsClosetOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const [processing, setProcessing] = useState<string | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        modelRef.current = await cocoSsd.load();
      } catch (err) {
        console.error("Failed to load AI model:", err);
      }
    };
    loadModel();
  }, []);

  const smartCrop = async (imageBlob: Blob, category: string): Promise<Blob> => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const model = modelRef.current || await cocoSsd.load();
          const predictions = await model.detect(img);
          const person = predictions.find(p => p.class === 'person');
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("Could not get canvas context");

          let sx = 0, sy = 0, sw = img.width, sh = img.height;

          if (person) {
            const [px, py, pw, ph] = person.bbox;
            if (category === 'Tops' || category === 'Outerwear') {
              sx = px + (pw * 0.1); sy = py + (ph * 0.15); sw = pw * 0.8; sh = ph * 0.55;       
            } else if (category === 'Bottoms') {
              sx = px + (pw * 0.05); sy = py + (ph * 0.4); sw = pw * 0.9; sh = ph * 0.6;        
            } else {
              sx = px; sy = py; sw = pw; sh = ph;
            }
            sx = Math.max(0, sx); sy = Math.max(0, sy);
            sw = Math.min(img.width - sx, sw);
            sh = Math.min(img.height - sy, sh);
          }

          canvas.width = sw + 100;
          canvas.height = sh + 100;
          ctx.filter = 'brightness(1.05) contrast(1.1)';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 30;
          ctx.drawImage(img, sx, sy, sw, sh, 50, 40, sw, sh);

          ctx.globalCompositeOperation = 'destination-out';
          const neckGrad = ctx.createLinearGradient(0, 40, 0, 100);
          neckGrad.addColorStop(0, 'rgba(0,0,0,1)');
          neckGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = neckGrad;
          ctx.fillRect(0, 0, canvas.width, 100);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          }, 'image/png');
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const addToCanvas = async (item: any) => {
    setProcessing(item.id);
    toast.loading('AI Extracting...', { id: 'canvas-ai' });
    
    try {
      // Fetch the image
      const response = await fetch(item.image_url);
      const blob = await response.blob();
      
      // Process with AI
      const noBgBlob = await removeBackground(blob);
      const finalBlob = await smartCrop(noBgBlob, item.category);
      const finalUrl = URL.createObjectURL(finalBlob);

      const newItem: CanvasItem = {
        id: Math.random().toString(36).substr(2, 9),
        item_id: item.id,
        image_url: finalUrl,
        x: window.innerWidth < 768 ? 50 : 100 + Math.random() * 50,
        y: window.innerWidth < 768 ? 150 : 100 + Math.random() * 50,
        rotation: 0,
        scale: window.innerWidth < 768 ? 0.8 : 1,
        zIndex: canvasItems.length + 1
      };
      setCanvasItems([...canvasItems, newItem]);
      toast.success('Clean extraction added', { id: 'canvas-ai' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract, adding original', { id: 'canvas-ai' });
      // Fallback
      const newItem: CanvasItem = {
        id: Math.random().toString(36).substr(2, 9),
        item_id: item.id,
        image_url: item.image_url,
        x: 100, y: 100, rotation: 0, scale: 1, zIndex: canvasItems.length + 1
      };
      setCanvasItems([...canvasItems, newItem]);
    } finally {
      setProcessing(null);
    }
    if (window.innerWidth < 1024) setIsClosetOpen(false);
  };

  const updateItem = (id: string, updates: Partial<CanvasItem>) => {
    setCanvasItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(0, ...canvasItems.map(i => i.zIndex));
    updateItem(id, { zIndex: maxZ + 1 });
  };

  const removeItem = (id: string) => {
    setCanvasItems(prev => prev.filter(item => item.id !== id));
  };

  const saveOutfit = async () => {
    if (!user || canvasItems.length === 0) return;
    if (!outfitName) {
      toast.error('Please name your masterpiece!');
      return;
    }

    try {
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert([{
          user_id: user.id,
          name: outfitName
        }])
        .select()
        .single();

      if (outfitError) throw outfitError;

      const outfitItems = canvasItems.map(ci => ({
        outfit_id: outfit.id,
        item_id: ci.item_id
      }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems);

      if (itemsError) throw itemsError;

      toast.success('Masterpiece saved!');
      setOutfitName('');
      setCanvasItems([]);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-[calc(100vh-6rem)] lg:h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-4 lg:gap-6 relative">
      {/* Studio Canvas */}
      <div className="flex-1 relative bg-[#09090b] rounded-[1.25rem] border border-white/5 overflow-hidden shadow-2xl group order-2 lg:order-1">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        
        <div className="absolute top-4 left-4 lg:top-8 lg:left-8 z-10">
          <div className="flex items-center gap-3 mb-1 lg:mb-2">
            <Palette className="text-primary w-5 h-5 lg:w-6 lg:h-6" />
            <h1 className="text-lg lg:text-2xl font-bold tracking-tight">Studio</h1>
          </div>
          <p className="text-[8px] lg:text-[10px] text-muted-foreground uppercase tracking-widest">Workspace</p>
        </div>

        {/* Action Bar */}
        <div className="absolute top-4 right-4 lg:top-8 lg:right-8 z-20 flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-1 lg:gap-2 bg-black/60 backdrop-blur-xl p-1 lg:p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <Input 
              placeholder="Name..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              className="bg-transparent border-none h-8 lg:h-10 w-24 lg:w-48 text-xs lg:text-sm focus-visible:ring-0"
            />
            <Button onClick={saveOutfit} className="h-8 lg:h-10 px-3 lg:px-6 rounded-xl shadow-lg shadow-primary/20 text-[10px] lg:text-sm">
              <Save size={14} className="lg:mr-2" />
              <span className="hidden lg:inline">Save Outfit</span>
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => setCanvasItems([])}
            className="h-8 w-8 lg:h-10 lg:w-10 p-0 rounded-xl bg-black/60 backdrop-blur-xl border border-white/5 text-muted-foreground"
          >
            <RotateCcw size={16} />
          </Button>
        </div>

        {/* Mobile FAB: Open Closet */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden">
          <Button
            onClick={() => setIsClosetOpen(true)}
            className="h-12 px-6 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 flex items-center gap-2 border border-white/10 active:scale-95 transition-transform"
          >
            <Plus size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Add Items</span>
          </Button>
        </div>

        {/* Items Canvas */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence>
            {canvasItems.map((item) => (
              <motion.div
                key={item.id}
                drag
                dragMomentum={false}
                onDragStart={() => bringToFront(item.id)}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: item.scale, opacity: 1, rotate: item.rotation }}
                exit={{ scale: 0.8, opacity: 0 }}
                style={{ 
                  position: 'absolute', 
                  left: item.x, 
                  top: item.y,
                  zIndex: item.zIndex,
                  cursor: 'move'
                }}
                className="group/item"
              >
                <div className="relative p-4">
                  <img 
                    src={item.image_url} 
                    alt="" 
                    className="w-48 h-auto pointer-events-none drop-shadow-2xl" 
                    draggable="false" 
                  />
                  
                  {/* Item Controls */}
                  <div className="absolute -top-2 -right-2 flex flex-col gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-full bg-destructive text-white shadow-lg hover:scale-110 transition-transform"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button 
                      onClick={() => updateItem(item.id, { scale: item.scale + 0.1 })}
                      className="p-2 rounded-full bg-white text-black shadow-lg hover:scale-110 transition-transform"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button 
                      onClick={() => updateItem(item.id, { rotation: item.rotation + 15 })}
                      className="p-2 rounded-full bg-white text-black shadow-lg hover:scale-110 transition-transform"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {canvasItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="text-primary" size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Empty Studio</h2>
            <p className="text-muted-foreground max-w-xs text-sm">
              Select items from your closet on the right to start building your next iconic look.
            </p>
          </div>
        )}
      </div>

      {/* Closet Sidebar (Desktop) / Bottom Sheet (Mobile) */}
      <div className="lg:w-80 h-full hidden lg:flex flex-col bg-card border-l border-white/5 rounded-[1.25rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Add to Studio</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Search closet..."
              className="w-full pl-10 pr-4 h-10 bg-black/20 border border-white/5 rounded-xl text-xs outline-none focus:border-primary transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['All', 'Tops', 'Bottoms', 'Shoes', 'Outerwear'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                  (selectedCategory === cat || (cat === 'All' && selectedCategory === null))
                    ? "bg-primary text-white"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => addToCanvas(item)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-primary/30 transition-all group text-left"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-lg">
                <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-xs truncate">{item.name}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.category}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {isClosetOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClosetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 z-40 w-full h-[70vh] flex flex-col bg-card border-t border-white/10 rounded-t-[2rem] overflow-hidden shadow-2xl lg:hidden"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4" />
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add to Studio</h3>
                <button onClick={() => setIsClosetOpen(false)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCanvas(item)}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-left"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-xs">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.category}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
