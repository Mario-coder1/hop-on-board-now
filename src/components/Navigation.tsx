import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, PlusCircle, User, LogOut, Car, MapPin, Shield, Trophy, GraduationCap, Leaf } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Navigation: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const isDriver = profile?.selected_role === 'driver';

  const navItems = isDriver
    ? [
        { path: '/driver', icon: Home, label: 'Domov' },
        { path: '/create-ride', icon: PlusCircle, label: 'Nová' },
        { path: '/my-rides', icon: Car, label: 'Jazdy' },
        { path: '/top-drivers', icon: Trophy, label: 'TOP 5' },
      ]
    : [
        { path: '/passenger', icon: Home, label: 'Domov' },
        { path: '/search', icon: Search, label: 'Hľadať' },
        { path: '/my-trips', icon: MapPin, label: 'Cesty' },
        { path: '/top-drivers', icon: Trophy, label: 'TOP 5' },
      ];

  return (
    <motion.nav
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 safe-top"
    >
      {/* Top bar — frosted glass with hairline */}
      <div className="glass-strong border-b border-border/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo — gradient mark + wordmark */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center transition-transform group-hover:rotate-3 group-hover:scale-105 shadow-cta">
                <span className="text-primary-foreground text-[14px] font-bold tracking-tighter">T.</span>
              </div>
              <span className="text-[16px] font-bold tracking-tight">
                take<span className="text-gradient-primary">me</span>
              </span>
            </Link>

            {/* Desktop nav — pill segmented */}
            <div className="hidden md:flex items-center gap-0.5 bg-muted/70 backdrop-blur rounded-full p-1 border border-border/60">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <div
                      className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground shadow-cta'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin">
                  <div
                    className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition-all ${
                      location.pathname === '/admin'
                        ? 'bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground shadow-cta'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </div>
                </Link>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pr-1 pl-1 h-9 rounded-full hover:bg-primary/5 transition-colors">
                    <Avatar className="w-8 h-8 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground text-[11px] font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl border border-border shadow-lg">
                  <div className="px-3 py-2.5">
                    <p className="font-semibold text-sm tracking-tight">{profile?.full_name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {profile?.rating?.toFixed(1)} ★ · {profile?.total_rides} jázd
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                      <User className="w-4 h-4" />
                      Môj profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/komunity" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                      <GraduationCap className="w-4 h-4" />
                      Univerzitné komunity
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/co2" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                      <Leaf className="w-4 h-4" />
                      CO₂ kalkulačka
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer rounded-lg text-sm">
                        <Shield className="w-4 h-4" />
                        Admin panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer rounded-lg text-sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Odhlásiť sa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav — floating glass with gradient active state */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom pb-2 px-3 pointer-events-none">
        <div className="pointer-events-auto glass-strong rounded-full shadow-xl px-1.5 py-1.5">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center justify-center min-w-[52px] h-12 px-2 rounded-full transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground shadow-cta'
                      : 'text-muted-foreground active:scale-95'
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className={`text-[9px] font-semibold mt-0.5 tracking-tight ${isActive ? 'opacity-100' : 'opacity-0 h-0'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`relative flex flex-col items-center justify-center min-w-[52px] h-12 px-2 rounded-full transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground shadow-cta'
                    : 'text-muted-foreground active:scale-95'
                }`}
              >
                <Shield className="w-[18px] h-[18px]" />
                <span className={`text-[9px] font-semibold mt-0.5 tracking-tight ${location.pathname === '/admin' ? 'opacity-100' : 'opacity-0 h-0'}`}>
                  Admin
                </span>
              </Link>
            )}
            <Link
              to="/profile"
              className={`relative flex flex-col items-center justify-center min-w-[52px] h-12 px-2 rounded-full transition-all ${
                location.pathname === '/profile'
                  ? 'bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground shadow-cta'
                  : 'text-muted-foreground active:scale-95'
              }`}
            >
              <User className="w-[18px] h-[18px]" />
              <span className={`text-[9px] font-semibold mt-0.5 tracking-tight ${location.pathname === '/profile' ? 'opacity-100' : 'opacity-0 h-0'}`}>
                Profil
              </span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
