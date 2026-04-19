import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { Mail, Lock, Loader2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-sm space-y-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
            <img src="/screen.png" alt="Atelier Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Atelier</h1>
        </div>

        <div className="p-8 rounded-2xl bg-card border border-white/[0.05] shadow-2xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your Atelier account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="pl-12 h-12 rounded-xl bg-[#1c1c21] border-white/5 focus:border-primary transition-all text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-12 h-12 rounded-xl bg-[#1c1c21] border-white/5 focus:border-primary transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all font-bold text-sm shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Sign up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 tracking-wide">
          Smart wardrobe management powered by AI
        </p>
      </div>
    </div>
  );
};

export const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email to verify');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-sm space-y-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
            <img src="/screen.png" alt="Atelier Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Atelier</h1>
        </div>

        <div className="p-8 rounded-2xl bg-card border border-white/[0.05] shadow-2xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Create account</h2>
            <p className="text-sm text-muted-foreground">Join the future of fashion</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="pl-12 h-12 rounded-xl bg-[#1c1c21] border-white/5 focus:border-primary transition-all text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-12 h-12 rounded-xl bg-[#1c1c21] border-white/5 focus:border-primary transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all font-bold text-sm shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Up'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 tracking-wide">
          Start building your digital closet today
        </p>
      </div>
    </div>
  );
};
