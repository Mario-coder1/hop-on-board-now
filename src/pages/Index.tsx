import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import RoleSelector from '@/components/RoleSelector';
import { Car, Users, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, profile, loading, updateRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile?.selected_role) {
      if (profile.selected_role === 'driver') {
        navigate('/driver');
      } else {
        navigate('/passenger');
      }
    }
  }, [user, profile, loading, navigate]);

  const handleRoleSelect = async (role: 'driver' | 'passenger') => {
    await updateRole(role);
    navigate(role === 'driver' ? '/driver' : '/passenger');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && !profile?.selected_role) {
    return <RoleSelector onSelect={handleRoleSelect} />;
  }

  const features = [
    { icon: Car, title: 'Ponúkni jazdu', desc: 'Zdieľaj cestu a ušetri na nákladoch' },
    { icon: Users, title: 'Nájdi spolucestujúcich', desc: 'Cestuj s overenými vodičmi' },
    { icon: MapPin, title: 'Live sledovanie', desc: 'Sleduj polohu v reálnom čase' },
    { icon: Shield, title: 'Bezpečnosť', desc: 'Overené profily a hodnotenia' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        
        <div className="relative container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
            >
              <Car className="w-5 h-5" />
              <span className="font-medium">TakeMe</span>
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              Cestuj spolu,
              <br />
              ušetri viac
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              Pripoj sa k tisícom ľudí, ktorí zdieľajú cesty po celom Slovensku. Bezpečne, pohodlne a ekonomicky.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-lg px-8"
              >
                Začať teraz
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/search')}
                className="text-lg px-8"
              >
                Hľadať jazdy
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-accent p-12 text-center"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Pripravený na cestu?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              Vytvor si účet zadarmo a začni cestovať ešte dnes.
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Registrovať sa
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;