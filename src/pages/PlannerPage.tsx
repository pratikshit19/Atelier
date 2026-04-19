import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button, Card, cn } from '../components/ui';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Sparkles, Shirt } from 'lucide-react';
import toast from 'react-hot-toast';

interface PlannedOutfit {
  id: string;
  date: string;
  outfit_id: string;
  outfit_name: string;
  items: any[];
}

export const PlannerPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannedOutfits, setPlannedOutfits] = useState<PlannedOutfit[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOutfitForDetail, setSelectedOutfitForDetail] = useState<PlannedOutfit | null>(null);

  useEffect(() => {
    fetchPlannedOutfits();
    fetchSavedOutfits();
  }, [user, currentDate]);

  const fetchSavedOutfits = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('outfits')
        .select(`
          *,
          outfit_items (
            items (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedOutfits(data || []);
    } catch (error: any) {
      console.error('Error fetching saved outfits:', error);
    }
  };

  const removeScheduledOutfit = async (date: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('wear_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('worn_at', `${date}T12:00:00Z`);

      if (error) throw error;
      toast.success('Schedule cleared');
      setIsDetailModalOpen(false);
      fetchPlannedOutfits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openDetail = (outfit: PlannedOutfit) => {
    setSelectedOutfitForDetail(outfit);
    setIsDetailModalOpen(true);
  };

  const scheduleOutfit = async (outfitId: string) => {
    if (!user || !selectedDate) return;
    try {
      // 1. Get items in this outfit to log them
      const outfit = savedOutfits.find(o => o.id === outfitId);
      if (!outfit) return;

      const itemsToLog = outfit.outfit_items.map((oi: any) => ({
        user_id: user.id,
        item_id: oi.items.id,
        outfit_id: outfitId,
        worn_at: `${selectedDate}T12:00:00Z`
      }));

      const { error } = await supabase.from('wear_logs').insert(itemsToLog);
      if (error) throw error;

      toast.success('Outfit scheduled!');
      setIsSelectModalOpen(false);
      fetchPlannedOutfits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchPlannedOutfits = async () => {
    if (!user) return;
    try {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('wear_logs')
        .select(`
          id,
          worn_at,
          outfit_id,
          outfits (
            name,
            outfit_items (
              items (*)
            )
          )
        `)
        .gte('worn_at', firstDay)
        .lte('worn_at', lastDay);

      if (error) throw error;

      // Group by date to avoid duplicates in display
      const uniqueDates: Record<string, PlannedOutfit> = {};
      data?.forEach(log => {
        const date = log.worn_at.split('T')[0];
        if (!uniqueDates[date]) {
          uniqueDates[date] = {
            id: log.id,
            date,
            outfit_id: log.outfit_id,
            outfit_name: (Array.isArray(log.outfits) ? log.outfits[0]?.name : (log.outfits as any)?.name) || 'Untitled Look',
            items: (Array.isArray(log.outfits) ? log.outfits[0]?.outfit_items : (log.outfits as any)?.outfit_items)?.map((oi: any) => oi.items) || []
          };
        }
      });

      setPlannedOutfits(Object.values(uniqueDates));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    return { days, firstDayIndex };
  };

  const { days, firstDayIndex } = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);
  const prevMonthPadding = Array.from({ length: firstDayIndex }, (_, i) => i);

  const getOutfitForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return plannedOutfits.find(p => p.date === dateStr);
  };

  const openSelector = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsSelectModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Sparkles className="w-12 h-12 animate-pulse text-primary" />
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Opening Schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Your Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan your looks for the month ahead.</p>
        </div>
        <div className="flex items-center gap-2 bg-secondary/20 p-1 rounded-xl border border-white/5">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
          >
            <ChevronLeft size={18} />
          </Button>
          <span className="text-sm font-bold min-w-[120px] text-center uppercase tracking-widest">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-card py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5">
            <span className="md:hidden">{day[0]}</span>
            <span className="hidden md:inline">{day}</span>
          </div>
        ))}
        
        {prevMonthPadding.map(i => (
          <div key={`pad-${i}`} className="bg-background/20 h-20 md:h-40" />
        ))}

        {daysArray.map(day => {
          const outfit = getOutfitForDay(day);
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
          
          return (
            <div 
              key={day} 
              onClick={outfit ? () => openDetail(outfit) : undefined}
              className={cn(
                "bg-card h-20 md:h-40 p-2 border-r border-b border-white/5 transition-all hover:bg-secondary/10 group relative",
                isToday && "bg-primary/5",
                outfit && "cursor-pointer"
              )}
            >
              <span className={cn(
                "text-[10px] md:text-xs font-bold",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {String(day).padStart(2, '0')}
              </span>

              {outfit ? (
                <div className="mt-1 md:mt-2 space-y-1">
                  <div className="flex -space-x-2">
                    {/* Show only 1 thumbnail on mobile, 3 on desktop */}
                    <div className="md:hidden w-6 h-6 rounded-full border border-background overflow-hidden bg-secondary mx-auto">
                      <img src={outfit.items[0]?.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="hidden md:flex -space-x-2">
                      {outfit.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-secondary">
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="hidden md:block text-[10px] font-medium truncate text-foreground">{outfit.outfit_name}</p>
                </div>
              ) : (
                <button 
                  onClick={() => openSelector(day)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus size={14} className="text-primary md:w-4 md:h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-primary text-white border-none shadow-xl shadow-primary/20">
          <Sparkles className="mb-4" size={24} />
          <h3 className="text-lg font-bold mb-2">Automated Planning</h3>
          <p className="text-xs text-primary-foreground font-medium leading-relaxed">
            Select saved outfits to schedule your week. Your Cost-Per-Wear will update automatically as the days pass.
          </p>
        </Card>
        
        <Card className="p-6 bg-card border-white/5 col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <CalendarIcon className="text-primary" size={20} />
            <h3 className="text-lg font-bold uppercase tracking-widest text-[10px]">Upcoming Events</h3>
          </div>
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm italic">
            No specific events scheduled for this month.
          </div>
        </Card>
      </div>

      {/* Outfit Selector Modal */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-8 relative shadow-2xl border-white/5">
            <button 
              onClick={() => setIsSelectModalOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-white"
            >
              <Plus size={24} className="rotate-45" />
            </button>
            
            <h2 className="text-2xl font-bold mb-2">Select Outfit</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8">Scheduling for {selectedDate}</p>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {savedOutfits.length > 0 ? savedOutfits.map(outfit => (
                <button
                  key={outfit.id}
                  onClick={() => scheduleOutfit(outfit.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/10 border border-white/5 hover:border-primary/50 transition-all group text-left"
                >
                  <div className="flex -space-x-3">
                    {outfit.outfit_items.slice(0, 3).map((oi: any, i: number) => (
                      <div key={i} className="w-12 h-12 rounded-xl border-2 border-[#18181b] overflow-hidden bg-muted">
                        <img src={oi.items.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{outfit.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{outfit.outfit_items.length} Items</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              )) : (
                <div className="text-center py-10">
                  <Shirt className="mx-auto mb-4 opacity-20" size={40} />
                  <p className="text-muted-foreground text-sm">No saved outfits found.</p>
                  <Button variant="ghost" onClick={() => window.location.href = '/suggestions'} className="text-primary mt-2">
                    Create some first
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Outfit Detail Modal */}
      {isDetailModalOpen && selectedOutfitForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <Card className="w-full max-w-lg p-8 relative shadow-2xl border-white/5 bg-card">
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-white"
            >
              <Plus size={24} className="rotate-45" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <CalendarIcon className="text-primary" size={20} />
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">Planned for {selectedOutfitForDetail.date}</p>
            </div>
            
            <h2 className="text-3xl font-bold mb-8">{selectedOutfitForDetail.outfit_name}</h2>
            
            <div className="grid grid-cols-1 gap-6 mb-8">
              {selectedOutfitForDetail.items.map((item, i) => (
                <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-secondary/10 border border-white/5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-lg">
                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{item.name}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md text-muted-foreground">{item.brand || 'No Brand'}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md text-muted-foreground">{item.material || 'Standard'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-destructive/20 text-destructive hover:bg-destructive hover:text-white rounded-2xl h-14 font-bold uppercase tracking-widest text-[10px]"
              onClick={() => removeScheduledOutfit(selectedOutfitForDetail.date)}
            >
              Clear Schedule for this day
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
