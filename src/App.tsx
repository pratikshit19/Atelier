import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { ClosetPage } from './pages/ClosetPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { OutfitsPage } from './pages/OutfitsPage';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import { Shirt, Sparkles, Layers } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-2">
        <h1 className="text-5xl font-semibold tracking-tight">
          Welcome, <span className="text-primary">{user?.email?.split('@')[0]}</span>
        </h1>
        <p className="text-lg text-muted-foreground font-normal">
          Your personal atelier, digitally curated in midnight blue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Closet Items', value: 'Check Closet', to: '/closet', icon: Shirt },
          { label: 'Combos Created', value: 'Get Suggestions', to: '/suggestions', icon: Sparkles },
          { label: 'Saved Looks', value: 'View Collection', to: '/outfits', icon: Layers }
        ].map((stat, i) => (
          <button 
            key={i}
            onClick={() => window.location.href = stat.to}
            className="p-8 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-border transition-all duration-300 group text-left relative overflow-hidden"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">{stat.label}</h3>
            <p className="text-xl font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-2">
              {stat.value} 
            </p>
          </button>
        ))}
      </div>

      <div className="p-10 rounded-3xl bg-secondary/40 border border-border relative overflow-hidden group">
        <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="text-primary" size={24} />
          Today's Suggestion
        </h2>
        <p className="text-muted-foreground/80 max-w-lg mb-8 leading-relaxed">
          Focus on your essential collection. Explore new ways to style your core items.
        </p>
        <button 
          onClick={() => window.location.href = '/suggestions'}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
        >
          View Recommendations
        </button>
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
