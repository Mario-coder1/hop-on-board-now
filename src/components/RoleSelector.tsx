import React from 'react';
import { motion } from 'framer-motion';
import { Car, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface RoleSelectorProps {
  onSelect: (role: 'driver' | 'passenger') => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  const { profile } = useAuth();

  const roles = [
    {
      id: 'driver' as const,
      title: 'Som vodič',
      description: 'Ponúkam voľné miesta vo svojom aute a zarábam počas cestovania',
      icon: Car,
      gradient: 'from-primary to-[hsl(190_80%_45%)]',
      features: ['Zarábaj za cestu', 'Zvol si spolucestujúcich', 'Flexibilný čas odchodu']
    },
    {
      id: 'passenger' as const,
      title: 'Som cestujúci',
      description: 'Hľadám spolujazdu a chcem cestovať výhodne a pohodlne',
      icon: Users,
      gradient: 'from-accent to-[hsl(25_90%_55%)]',
      features: ['Lacnejšie ako autobus', 'Pohodlná cesta', 'Sleduj vodiča live']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Vitajte, <span className="gradient-text">{profile?.full_name}</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Čo chcete dnes robiť?
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
            >
              <button
                onClick={() => onSelect(role.id)}
                className="w-full text-left group"
              >
                <div className="relative overflow-hidden rounded-2xl bg-card border-2 border-transparent hover:border-primary/30 shadow-card hover:shadow-lg transition-all duration-300 p-8">
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <role.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h2 className="font-display text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {role.title}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {role.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {role.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${role.gradient}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all">
                    Pokračovať
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;