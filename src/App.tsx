import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { ClosetPage } from './pages/ClosetPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { OutfitsPage } from './pages/OutfitsPage';
import { PlannerPage } from './pages/PlannerPage';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import { Sparkles, Shirt } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState({
    totalItems: 0,
    totalValue: 0,
    avgCPW: 0,
    topROIItem: null as any,
    mostWorn: [] as any[]
  });
  const [weather, setWeather] = React.useState({
    temp: '--',
    condition: 'Loading...',
    city: 'Detecting...',
    icon: 'Sun'
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://wttr.in/?format=j1');
        const data = await res.json();
        const current = data.current_condition[0];
        const area = data.nearest_area[0];
        
        setWeather({
          temp: current.temp_C,
          condition: current.weatherDesc[0].value,
          city: `${area.areaName[0].value}, ${area.country[0].value}`,
          icon: current.weatherDesc[0].value.toLowerCase().includes('cloud') ? 'Cloud' : 'Sun'
        });
      } catch (error) {
        console.error('Weather fetch error:', error);
        setWeather(prev => ({ ...prev, condition: 'Weather Unavailable' }));
      }
    };

    fetchWeather();

    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        const { data: items } = await supabase.from('items').select('*');
        const { data: logs } = await supabase.from('wear_logs').select('*');

        if (items) {
          const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);
          const itemWears = items.map(item => {
            const count = logs?.filter(log => log.item_id === item.id).length || 0;
            const cpw = count > 0 ? (item.price || 0) / count : (item.price || 0);
            return { ...item, count, cpw };
          });

          const totalWears = logs?.length || 0;
          const avgCPW = totalWears > 0 ? totalValue / totalWears : 0;
          const sortedByROI = [...itemWears].sort((a, b) => (a.cpw || 0) - (b.cpw || 0));
          const sortedByWears = [...itemWears].sort((a, b) => b.count - a.count);

          setStats({
            totalItems: items.length,
            totalValue,
            avgCPW,
            topROIItem: sortedByROI[0],
            mostWorn: sortedByWears.slice(0, 3)
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-semibold tracking-tight">
            Welcome, <span className="text-primary">{user?.email?.split('@')[0]}</span>
          </h1>
          <p className="text-lg text-muted-foreground font-normal">
            Portfolio summary of your digital collection.
          </p>
        </div>
        
        <div className="p-4 rounded-2xl bg-secondary/20 border border-white/5 flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            {weather.icon === 'Sun' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19x3.5a3.5 0 0 1-3.5-3.5c0-1.2.6-2.3 1.7-3C15.1 9.8 15.1 7 13.5 5.5s-4.3-1.6-6 0C5.9 7 5.9 9.8 7.5 12.5c-1.1.7-1.7 1.8-1.7 3 0 1.9 1.6 3.5 3.5 3.5h8.2"/></svg>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{weather.city}</p>
            <p className="text-xl font-bold tracking-tight">{weather.temp}°C <span className="text-sm font-medium text-muted-foreground ml-1">{weather.condition}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Value', value: `$${stats.totalValue.toLocaleString()}`, sub: 'Value' },
          { label: 'Avg. CPW', value: `$${stats.avgCPW.toFixed(2)}`, sub: 'CPW' },
          { label: 'Active Items', value: stats.totalItems, sub: 'Items' },
          { label: 'Top ROI', value: stats.topROIItem?.name || 'N/A', sub: stats.topROIItem ? `$${stats.topROIItem.cpw.toFixed(2)}` : 'No data' }
        ].map((stat, i) => (
          <div 
            key={i}
            className="p-5 md:p-8 rounded-2xl bg-card border border-white/5 transition-all duration-300 group relative overflow-hidden"
          >
            <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 md:mb-4">{stat.label}</h3>
            <p className="text-lg md:text-2xl font-bold tracking-tight mb-0.5 md:mb-1">{stat.value}</p>
            <p className="text-[8px] md:text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 rounded-[2.5rem] bg-card border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="text-primary" size={24} />
              Most Worn Pieces
            </h2>
          </div>
          <div className="space-y-4">
            {stats.mostWorn.length > 0 ? stats.mostWorn.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-2xl bg-black/20 border border-white/5">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Shirt className="w-full h-full p-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.count} Wears</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">${item.cpw.toFixed(2)}</p>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-tighter">CPW</p>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm italic">No wear data logged yet.</p>
            )}
          </div>
        </div>

        <div className="p-10 rounded-[2.5rem] bg-primary text-white relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-3">Daily Recommendation</h2>
            <p className="text-primary-foreground/90 max-w-lg mb-8 leading-relaxed font-medium">
              Based on your current portfolio, we recommend rotating your {stats.mostWorn[2]?.name || 'essential'} collection.
            </p>
            <button 
              onClick={() => window.location.href = '/suggestions'}
              className="px-8 py-3 bg-white text-primary rounded-xl font-bold hover:bg-white/90 transition-all shadow-xl"
            >
              Style Today's Look
            </button>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4">
            <Sparkles size={160} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-3xl tracking-tighter">ATELIE</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/closet" element={<ProtectedRoute><ClosetPage /></ProtectedRoute>} />
          <Route path="/suggestions" element={<ProtectedRoute><SuggestionsPage /></ProtectedRoute>} />
          <Route path="/outfits" element={<ProtectedRoute><OutfitsPage /></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#09090b',
          color: '#fafafa',
          border: '1px solid #27272a',
          borderRadius: '1rem',
          padding: '1rem',
        },
      }} />
    </AuthProvider>
  );
}

export default App;
