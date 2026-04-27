import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Car, MapPin, Users, ArrowRight, Mail, Lock, User } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
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
      {/* Floating decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/25 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      {/* Left side - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-secondary to-[hsl(220_30%_20%)] relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 30%, hsl(174 80% 45% / 0.4), transparent 50%), radial-gradient(circle at 80% 70%, hsl(195 90% 55% / 0.3), transparent 50%)' }} />
        
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
        className="flex-1 flex items-center justify-center px-8 py-12"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-4xl font-bold">
              Take<span className="text-primary">Me</span>
            </h1>
            <p className="text-muted-foreground mt-2">Zdieľaj jazdu, cestuj spolu</p>
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;