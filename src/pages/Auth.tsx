import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Car, MapPin, Users, ArrowRight, Mail, Lock, User, FileText } from 'lucide-react';
import SEO from '@/components/SEO';
import AnimatedAuthBackground from '@/components/AnimatedAuthBackground';
import AuthOnboardingSteps from '@/components/AuthOnboardingSteps';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Chyba prihlásenia",
            description: error.message === 'Invalid login credentials' 
              ? 'Nesprávny email alebo heslo' 
              : error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Vitajte späť!",
            description: "Úspešne ste sa prihlásili."
          });
          navigate('/');
        }
      } else {
        if (!fullName.trim()) {
          toast({
            title: "Chyba",
            description: "Prosím vyplňte meno",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        if (!agreedToTerms) {
          toast({
            title: "Chyba",
            description: "Pre registráciu musíte súhlasiť s obchodnými podmienkami",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: "Chyba registrácie",
            description: error.message === 'User already registered'
              ? 'Používateľ s týmto emailom už existuje'
              : error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Účet vytvorený!",
            description: "Môžete sa prihlásiť."
          });
          navigate('/');
        }
      }
    } catch (err) {
      toast({
        title: "Chyba",
        description: "Nastala neočakávaná chyba",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-mesh flex relative overflow-hidden">
      <SEO
        title={isLogin ? 'Prihlásenie' : 'Registrácia'}
        description="Prihlás sa do TakeMe alebo si vytvor účet zadarmo. Zdieľaj jazdy a šetri náklady na cestovanie."
        path="/auth"
        noindex
      />
      {/* Floating decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/25 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      {/* Mobile/tablet animated map background */}
      <div className="pointer-events-none absolute inset-0 z-0 lg:hidden opacity-70">
        <AnimatedAuthBackground />
      </div>

      {/* Left side - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-secondary to-[hsl(220_30%_20%)] relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 20% 30%, hsl(174 80% 45% / 0.35), transparent 55%), radial-gradient(circle at 80% 70%, hsl(195 90% 55% / 0.25), transparent 55%)' }} />
        <AnimatedAuthBackground />

        <div className="relative z-10 flex flex-col justify-center px-12 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="font-display text-5xl font-bold text-primary-foreground mb-4">
              Take<span className="text-primary">Me</span>
            </h1>
            <p className="text-xl text-primary-foreground/80 mb-12">
              Zdieľaj jazdu, šetri peniaze, chráň planétu.
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              { icon: Car, title: "Ponúkaj jazdy", desc: "Zarábaj ako vodič zdieľaním voľných miest" },
              { icon: MapPin, title: "Nájdi spolujazdu", desc: "Cestuj lacno a pohodlne kamkoľvek" },
              { icon: Users, title: "Buduj komunitu", desc: "Spoj sa s ľuďmi na rovnakej trase" }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                className="flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-primary-foreground text-lg">{item.title}</h3>
                  <p className="text-primary-foreground/60">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12"
          >
            <AuthOnboardingSteps />
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-20 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl" />
      </motion.div>

      {/* Right side - Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex-1 flex items-center justify-center px-8 py-12"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative h-36 mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-secondary/70 shadow-glass">
              <AnimatedAuthBackground />
            </div>
            <h1 className="font-display text-4xl font-bold">
              Take<span className="text-primary">Me</span>
            </h1>
            <p className="text-muted-foreground mt-2">Zdieľaj jazdu, cestuj spolu</p>
          </div>

          <div className="lg:hidden mb-6">
            <AuthOnboardingSteps />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass-strong rounded-3xl p-8 shadow-glass-lg"
          >
            <h2 className="font-display text-2xl font-bold mb-2">
              {isLogin ? 'Vitajte späť' : 'Vytvorte si účet'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {isLogin 
                ? 'Prihláste sa a pokračujte v ceste' 
                : 'Začnite zdieľať jazdy ešte dnes'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Celé meno</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Ján Novák"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-11 h-12"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vas@email.sk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Heslo</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="flex items-start gap-3">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    Súhlasím s{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      obchodnými podmienkami
                    </a>{' '}
                    a{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      zásadami ochrany súkromia
                    </a>
                  </label>
                </div>
              )}

              <Button
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Prihlásiť sa' : 'Vytvoriť účet'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">alebo</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={async () => {
                  const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
                  if (result.error) toast({ title: 'Chyba', description: result.error.message, variant: 'destructive' });
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Pokračovať s Google
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={async () => {
                  const result = await lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin });
                  if (result.error) toast({ title: 'Chyba', description: result.error.message, variant: 'destructive' });
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.86-3.08.43-1.09-.45-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.43C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.50-3.74 4.25z"/></svg>
                Pokračovať s Apple
              </Button>
            </div>

            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Zabudli ste heslo?
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? (
                  <>Nemáte účet? <span className="font-semibold text-primary">Zaregistrujte sa</span></>
                ) : (
                  <>Už máte účet? <span className="font-semibold text-primary">Prihláste sa</span></>
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <a
                href="/tutorial"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <FileText className="w-4 h-4" />
                Tutoriál — ako TakeMe funguje
              </a>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obnova hesla</DialogTitle>
            <DialogDescription>
              Pošleme vám email s odkazom na nastavenie nového hesla.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!forgotEmail.trim()) return;
              setForgotLoading(true);
              const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              setForgotLoading(false);
              if (error) {
                toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
              } else {
                toast({ title: 'Email odoslaný', description: 'Skontrolujte si schránku.' });
                setForgotOpen(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="vas@email.sk"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="pl-11 h-12"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" variant="hero" disabled={forgotLoading} className="w-full">
                {forgotLoading ? 'Odosielam...' : 'Poslať odkaz na obnovu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;