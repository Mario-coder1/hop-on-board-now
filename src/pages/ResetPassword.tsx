import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import SEO from '@/components/SEO';

function validatePasswordStrict(pwd: string): string | null {
  if (pwd.length < 8) return 'Heslo musí mať aspoň 8 znakov.';
  if (!/[a-z]/.test(pwd)) return 'Heslo musí obsahovať aspoň jedno malé písmeno.';
  if (!/[A-Z]/.test(pwd)) return 'Heslo musí obsahovať aspoň jedno veľké písmeno.';
  if (!/[0-9]/.test(pwd)) return 'Heslo musí obsahovať aspoň jednu číslicu.';
  if (/^(password|heslo|12345678|qwerty|11111111|abcdefgh)/i.test(pwd)) return 'Heslo je príliš slabé.';
  return null;
}

function passwordStrength(pwd: string): { score: number; label: string; color: string; hint: string | null } {
  if (!pwd) return { score: 0, label: '', color: '', hint: null };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const hint = validatePasswordStrict(pwd);
  const labels = ['Veľmi slabé', 'Slabé', 'Stredné', 'Dobré', 'Silné', 'Veľmi silné'];
  const colors = ['bg-destructive', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
  if (hint) {
    return { score: 1, label: labels[1], color: colors[1], hint };
  }
  return { score, label: labels[score], color: colors[score], hint };
}

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase auth recovery token comes in URL hash; the client picks it up automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // Also check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwdError = validatePasswordStrict(password);
    if (pwdError) {
      toast({ title: 'Heslo nie je dostatočne silné', description: pwdError, variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Heslá sa nezhodujú', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Heslo zmenené', description: 'Môžete pokračovať.' });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4 relative overflow-hidden">
      <SEO title="Obnovenie hesla" description="Nastavte si nové heslo do TakeMe." path="/reset-password" noindex />
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/25 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-glass-lg relative z-10"
      >
        <h1 className="font-display text-2xl font-bold mb-2">Nové heslo</h1>
        <p className="text-muted-foreground mb-6">
          {ready ? 'Zadajte si nové heslo do účtu TakeMe.' : 'Overujem odkaz na obnovenie...'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nové heslo</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11 h-12"
                required
                minLength={6}
                disabled={!ready}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Potvrdenie hesla</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-11 pr-11 h-12"
                required
                minLength={6}
                disabled={!ready}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Skryť heslo' : 'Zobraziť heslo'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || !ready}>
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>Uložiť nové heslo <ArrowRight className="w-5 h-5" /></>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
