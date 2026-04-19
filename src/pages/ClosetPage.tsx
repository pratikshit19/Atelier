import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, cn } from '../components/ui';
import { 
  Plus, 
  Search, 
  Filter, 
  Image as ImageIcon, 
  Loader2, 
  Trash2,
  X,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  image_url: string;
  occasion: string[];
  price: number;
  brand: string;
  material: string;
  is_wishlist: boolean;
  purchase_date: string;
}

const CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

export const ClosetPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form State
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Tops',
    color: '',
    price: '',
    brand: '',
    material: '',
    is_wishlist: false,
    removeBackground: false,
    image: null as File | null
  });

  useEffect(() => {
    fetchItems();
  }, [user]);

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.image || !user) return;

    setUploading(true);
    try {
      // 1. Upload image to Storage
      const fileExt = newItem.image.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('clothing-items')
        .upload(filePath, newItem.image, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('clothing-items')
        .getPublicUrl(filePath);

      // 3. Save to Database
      const { error: dbError } = await supabase
        .from('items')
        .insert([{
          user_id: user.id,
          name: newItem.name,
          category: newItem.category,
          color: newItem.color,
          price: parseFloat(newItem.price) || 0,
          brand: newItem.brand,
          material: newItem.material,
          is_wishlist: newItem.is_wishlist,
          image_url: publicUrl,
          occasion: []
        }]);

      if (dbError) throw dbError;

      toast.success('Item added to closet!');
      setIsUploadModalOpen(false);
      setNewItem({ name: '', category: 'Tops', color: '', price: '', brand: '', material: '', is_wishlist: false, removeBackground: false, image: null });
      fetchItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (id: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Delete from Storage (optional but good practice)
      // Extract path from URL if possible, for now just updating UI
      setItems(items.filter(item => item.id !== id));
      toast.success('Item removed');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Your Closet</h1>
          <p className="text-sm text-muted-foreground mt-1">Refining your personal collection.</p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2 rounded-none border-b-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground transition-all">
          <Plus size={18} />
          <span>Add Item</span>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 pt-4 border-t border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-3 w-4 h-4 text-muted-foreground" />
          <input 
            placeholder="Search collection..." 
            className="pl-8 h-10 w-full bg-transparent border-b border-border focus:border-primary outline-none text-sm transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4 overflow-x-auto">
          {['All', ...CATEGORIES].map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
              className={cn(
                "text-xs uppercase tracking-widest pb-1 border-b-2 transition-all",
                (selectedCategory === cat || (cat === 'All' && selectedCategory === null))
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Opening your closet...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-muted-foreground mb-4">
            <Shirt size={32} />
          </div>
          <h3 className="text-xl font-medium">No items found</h3>
          <p className="text-muted-foreground mt-2">Start by adding your first clothing item.</p>
          <Button variant="outline" className="mt-6" onClick={() => setIsUploadModalOpen(true)}>
            Add Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="group relative">
              <div className="aspect-square rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-card border border-white/5 relative shadow-xl">
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                {item.is_wishlist && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                    Wishlist
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => deleteItem(item.id, item.image_url)}
                    className="w-10 h-10 rounded-full bg-destructive text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4 px-2">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{item.category}</p>
                <h3 className="text-sm font-medium text-foreground truncate">{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 relative shadow-2xl border-primary/20">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Add New Item</h2>
            
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-xl bg-muted/30 group hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                  {newItem.image ? (
                    <>
                      <img 
                        src={URL.createObjectURL(newItem.image)} 
                        className="w-full h-full object-contain" 
                        alt="Preview" 
                      />
                      <button 
                        type="button"
                        onClick={() => setNewItem({...newItem, image: null})}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 hover:bg-background backdrop-blur-md"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                      <p className="text-sm font-medium">Click to upload image</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*"
                    onChange={(e) => setNewItem({...newItem, image: e.target.files?.[0] || null})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input 
                      placeholder="e.g. Black Hoodie"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-card">{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price ($)</label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Brand</label>
                    <Input 
                      placeholder="e.g. Nike"
                      value={newItem.brand}
                      onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Material</label>
                    <Input 
                      placeholder="e.g. Cotton"
                      value={newItem.material}
                      onChange={(e) => setNewItem({...newItem, material: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-primary" />
                    <div>
                      <p className="text-sm font-bold">AI Background Removal</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Create a studio-clean look</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-primary"
                    checked={newItem.removeBackground}
                    onChange={(e) => setNewItem({...newItem, removeBackground: e.target.checked})}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="wishlist"
                    className="w-4 h-4 accent-primary"
                    checked={newItem.is_wishlist}
                    onChange={(e) => setNewItem({...newItem, is_wishlist: e.target.checked})}
                  />
                  <label htmlFor="wishlist" className="text-sm font-medium cursor-pointer">Mark as Wishlist Item</label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={uploading || !newItem.image}
                >
                  {uploading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Add to Closet'}
                </Button>
              </div>
            </form>
            
            {uploading && newItem.removeBackground && (
              <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl z-10 animate-in fade-in duration-300">
                <div className="w-16 h-16 relative mb-4">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto text-primary animate-pulse" size={24} />
                </div>
                <h3 className="text-xl font-bold">AI Studio Processing</h3>
                <p className="text-muted-foreground text-sm mt-2">Stripping background for a clean look...</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

const Shirt = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </svg>
);
