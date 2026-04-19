import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shirt,
  Sparkles,
  Layers,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  X,
  Calendar
} from 'lucide-react';
import { cn } from './ui';
import { Button } from './ui';

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-4 px-6 py-4 transition-all duration-200 group relative",
      active
        ? "bg-white/[0.03] text-white"
        : "text-muted-foreground hover:bg-white/[0.01] hover:text-foreground"
    )}
  >
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />}
    <Icon className={cn("w-5 h-5", active ? "text-primary" : "opacity-60 group-hover:opacity-100")} />
    <span className={cn("text-sm font-medium", active ? "text-white" : "text-muted-foreground")}>{label}</span>
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/closet', icon: Shirt, label: 'Your Closet' },
    { to: '/suggestions', icon: Sparkles, label: 'Smart Combos' },
    { to: '/outfits', icon: Layers, label: 'Saved Outfits' },
    { to: '/planner', icon: Calendar, label: 'Planner' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans">
      {/* Sidebar - Desktop (Floating Pillar) */}
      <aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-64 flex-col bg-card rounded-[2rem] border border-white/[0.05] z-30 shadow-2xl">
        <div className="flex items-center gap-3 px-8 py-8">
          <div className="w-10 h-10 rounded-xl overflow-hidden">
            <img src="/screen.png" alt="Atelie Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Atelie</h1>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={pathname === item.to}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/[0.05] py-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-8 py-4 text-muted-foreground hover:text-white transition-all group"
          >
            <LogOut size={20} className="opacity-60 group-hover:opacity-100" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header (Minimalist) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 z-40 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/screen.png" alt="Atelie Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg font-bold">Atelie</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold border border-white/10">
          {user?.email?.[0].toUpperCase()}
        </div>
      </div>

      {/* Mobile Bottom Navigation (Fintrack Style) */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-card/60 backdrop-blur-3xl border border-white/[0.05] rounded-[2rem] flex items-center justify-around px-4 z-50 shadow-2xl">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              pathname === item.to ? "bg-primary/20 text-primary" : "text-muted-foreground opacity-60"
            )}
          >
            <item.icon size={24} />
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="p-3 rounded-2xl text-muted-foreground opacity-60 hover:text-white"
        >
          <LogOut size={24} />
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 overflow-y-auto h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6 pt-24 pb-32 md:pb-10 md:pt-10">
          {children}
        </div>
      </main>
    </div>
  );
};
