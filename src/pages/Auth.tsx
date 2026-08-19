import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Car, MapPin, Users, ArrowRight, Mail, Lock, User, FileText, Eye, EyeOff, Shield, Cookie } from 'lucide-react';
import SEO from '@/components/SEO';
import AnimatedAuthBackground from '@/components/AnimatedAuthBackground';
import AuthOnboardingSteps from '@/components/AuthOnboardingSteps';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const HCAPTCHA_SITE_KEY = '635cb8c2-054a-4882-9748-64663074cbf0';

// Striktný RFC-lite email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Zoznam najznámejších dočasných / disposable email domén
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.info','guerrillamail.biz','guerrillamail.net','guerrillamail.org','guerrillamailblock.com',
  'sharklasers.com','grr.la','10minutemail.com','10minutemail.net','tempmail.com','temp-mail.org','temp-mail.io','tempail.com','tempmailaddress.com',
  'throwawaymail.com','yopmail.com','yopmail.fr','yopmail.net','trashmail.com','trashmail.net','trashmail.de','dispostable.com','getnada.com','nada.email',
  'maildrop.cc','mintemail.com','mohmal.com','fakeinbox.com','spamgourmet.com','mailnesia.com','mytemp.email','tempr.email','spam4.me','emailondeck.com',
  'mailcatch.com','tempinbox.com','easytrashmail.com','moakt.com','inboxbear.com','tempmailo.com','minuteinbox.com','tmpmail.org','disbox.net',
  'jetable.org','mvrht.com','anonbox.net','spambog.com','spambox.us','byom.de','meltmail.com','tempm.com','snapmail.cc'
]);

function validateEmailStrict(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return 'Email má neplatnú dĺžku.';
  if (!EMAIL_REGEX.test(email)) return 'Zadaj platnú emailovú adresu.';
  const domain = email.split('@')[1];
  if (!domain || !domain.includes('.')) return 'Neplatná doména emailu.';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'Dočasné / jednorazové emailové adresy nie sú povolené.';
  // Zakáž subdoménu disposable poskytovateľov
  for (const d of DISPOSABLE_DOMAINS) {
    if (domain.endsWith('.' + d)) return 'Dočasné / jednorazové emailové adresy nie sú povolené.';
  }
  return null;
}

function validatePasswordStrict(pwd: string): string | null {
  if (pwd.length < 8) return 'Heslo musí mať aspoň 8 znakov.';
  if (!/[a-z]/.test(pwd)) return 'Heslo musí obsahovať aspoň jedno malé písmeno.';
  if (!/[A-Z]/.test(pwd)) return 'Heslo musí obsahovať aspoň jedno veľké písmeno.';
  if (!/[0-9]/.test(pwd)) return 'Heslo musí obsahovať aspoň jednu číslicu.';
  // jednoduché slovníkové heslá
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
  // Ak heslo nespĺňa striktné pravidlá, nesmie sa tváriť ako silné
  if (hint) {
    return { score: 1, label: labels[1], color: colors[1], hint };
  }
  return { score, label: labels[score], color: colors[score], hint };
}


function validateFullNameStrict(name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return 'Meno musí mať aspoň 2 znaky.';
  if (n.length > 100) return 'Meno je príliš dlhé.';
  if (!/\s/.test(n)) return 'Zadaj celé meno (krstné meno aj priezvisko).';
  if (!/^[\p{L}\p{M}'’\-\s.]+$/u.test(n)) return 'Meno môže obsahovať len písmená, medzery a pomlčky.';
  return null;
}

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha | null>(null);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Preserve ?next= (must be same-origin relative path) through login/signup/OAuth
  const rawNext = searchParams.get('next');
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, navigate, nextPath]);

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
          navigate(nextPath, { replace: true });
        }
      } else {
        const nameErr = validateFullNameStrict(fullName);
        if (nameErr) {
          toast({ title: 'Neplatné meno', description: nameErr, variant: 'destructive' });
          setLoading(false);
          return;
        }
        const emailErr = validateEmailStrict(email);
        if (emailErr) {
          toast({ title: 'Neplatný email', description: emailErr, variant: 'destructive' });
          setLoading(false);
          return;
        }
        const pwdErr = validatePasswordStrict(password);
        if (pwdErr) {
          toast({ title: 'Slabé heslo', description: pwdErr, variant: 'destructive' });
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({ title: 'Heslá sa nezhodujú', description: 'Zadané heslá musia byť rovnaké.', variant: 'destructive' });
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
        if (!captchaToken) {
          toast({
            title: "Overenie CAPTCHA",
            description: "Prosím potvrď, že nie si robot.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Server-side hCaptcha verification
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-captcha', {
          body: { token: captchaToken },
        });
        if (verifyError || !verifyData?.success) {
          toast({
            title: "CAPTCHA zlyhala",
            description: "Overenie sa nepodarilo. Skús to znova.",
            variant: "destructive"
          });
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email.trim().toLowerCase(), password, fullName.trim());
        if (error) {
          toast({
            title: "Chyba registrácie",
            description: error.message === 'User already registered'
              ? 'Používateľ s týmto emailom už existuje'
              : error.message,
            variant: "destructive"
          });
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
        } else {
          toast({
            title: "Skontroluj svoj email 📧",
            description: "Poslali sme ti potvrdzovací link. Klikni naň v emaili a potom sa môžeš prihlásiť.",
            duration: 10000,
          });
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
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
            <h1 className="font-display text-5xl font-bold text-black mb-4">
              Take<span className="text-primary">Me</span>
              <span className="sr-only"> — Prihlásenie a registrácia</span>
            </h1>
            <p className="text-xl text-black/80 mb-12">
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
                  <h3 className="font-display font-semibold text-black text-lg">{item.title}</h3>
                  <p className="text-black/70">{item.desc}</p>
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
            <p className="font-display text-4xl font-bold" aria-hidden="true">
              Take<span className="text-primary">Me</span>
            </p>
            <p className="text-muted-foreground mt-2">Zdieľaj jazdu, cestuj spolu</p>
          </div>

          <div className="lg:hidden mb-6">
            <AuthOnboardingSteps />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass-strong rounded-3xl p-6 sm:p-8 shadow-glass-lg border border-border/60"
          >
            {/* Segmented switcher */}
            <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-muted/60 mb-7">
              <motion.div
                className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl bg-background shadow-sm"
                animate={{ left: isLogin ? '0.25rem' : 'calc(50% + 0rem)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors ${isLogin ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Prihlásenie
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`relative z-10 h-10 rounded-xl text-sm font-semibold transition-colors ${!isLogin ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Registrácia
              </button>
            </div>

            <div className="mb-7">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  {isLogin ? <Lock className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                </div>
                <h2 className="font-display text-2xl font-bold leading-tight">
                  {isLogin ? 'Vitajte späť' : 'Vytvorte si účet'}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLogin
                  ? 'Prihláste sa a pokračujte v ceste.'
                  : 'Zaregistrujte sa a začnite zdieľať jazdy ešte dnes.'}
              </p>
            </div>


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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Heslo</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Zabudli ste heslo?
                    </button>
                  )}
                </div>

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
                    minLength={isLogin ? 6 : 8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isLogin && password.length > 0 && (() => {
                  const s = passwordStrength(password);
                  return (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[0,1,2,3,4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < s.score ? s.color : 'bg-muted'}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${s.hint ? 'text-destructive' : 'text-green-600'}`}>
                        {s.hint || `Sila hesla: ${s.label}`}
                      </p>
                    </div>
                  );
                })()}
                {!isLogin && password.length === 0 && (
                  <p className="text-xs text-muted-foreground">Min. 8 znakov, veľké aj malé písmeno a číslica.</p>
                )}
              </div>


              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potvrď heslo</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 pr-11 h-12"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Heslá sa nezhodujú.</p>
                  )}
                </div>
              )}



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

              {!isLogin && (
                <div className="flex justify-center">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={HCAPTCHA_SITE_KEY}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                  />
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
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">alebo</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full h-12 rounded-xl gap-2 hover:bg-muted/60"
                onClick={async () => {
                  const redirect = window.location.origin + nextPath;
                  const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: redirect });
                  if (result.error) toast({ title: 'Chyba', description: result.error.message, variant: 'destructive' });
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                <span className="text-sm">Google</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full h-12 rounded-xl gap-2 hover:bg-muted/60"
                onClick={async () => {
                  const redirect = window.location.origin + nextPath;
                  const result = await lovable.auth.signInWithOAuth('apple', { redirect_uri: redirect });
                  if (result.error) toast({ title: 'Chyba', description: result.error.message, variant: 'destructive' });
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.86-3.08.43-1.09-.45-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.43C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.50-3.74 4.25z"/></svg>
                <span className="text-sm">Apple</span>
              </Button>
            </div>

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

            <div className="mt-6 pt-5 border-t border-border/50 space-y-3">
              <a
                href="/tutorial"
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-muted/50 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                <FileText className="w-4 h-4" />
                Tutoriál — ako TakeMe funguje
              </a>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px]">
                <a href="/terms" className="inline-flex items-center gap-1 text-muted-foreground/80 hover:text-primary transition-colors">
                  <FileText className="w-3 h-3" /> Podmienky
                </a>
                <span className="text-border">•</span>
                <a href="/privacy" className="inline-flex items-center gap-1 text-muted-foreground/80 hover:text-primary transition-colors">
                  <Shield className="w-3 h-3" /> Súkromie
                </a>
                <span className="text-border">•</span>
                <a href="/gdpr" className="inline-flex items-center gap-1 text-muted-foreground/80 hover:text-primary transition-colors">
                  <Shield className="w-3 h-3" /> GDPR
                </a>
                <span className="text-border">•</span>
                <a href="/cookies" className="inline-flex items-center gap-1 text-muted-foreground/80 hover:text-primary transition-colors">
                  <Cookie className="w-3 h-3" /> Cookies
                </a>
              </div>
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