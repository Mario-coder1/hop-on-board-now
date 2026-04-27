import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, PlusCircle, User, LogOut, Car, MapPin, Shield, Trophy } from 'lucide-react';
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
        { path: '/create-ride', icon: PlusCircle, label: 'Nová jazda' },
        { path: '/my-rides', icon: Car, label: 'Moje jazdy' },
        { path: '/top-drivers', icon: Trophy, label: 'TOP 5' },
      ]
    : [
        { path: '/passenger', icon: Home, label: 'Domov' },
        { path: '/search', icon: Search, label: 'Hľadať' },
        { path: '/my-trips', icon: MapPin, label: 'Moje cesty' },
        { path: '/top-drivers', icon: Trophy, label: 'TOP 5' },
      ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 px-3 pt-3"
    >
      <div className="container mx-auto">
        <div className="bento-card !rounded-2xl px-3 md:px-4 flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg md:text-xl font-bold tracking-tight">
              Take<span className="text-primary">Me</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={location.pathname === '/admin' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border shadow-lg">
                <div className="px-3 py-2">
                  <p className="font-semibold">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.rating?.toFixed(1)} ⭐ · {profile?.total_rides} jázd
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer rounded-xl">
                    <User className="w-4 h-4" />
                    Môj profil
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer rounded-xl">
                      <Shield className="w-4 h-4" />
                      Admin panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer rounded-xl">
                  <LogOut className="w-4 h-4 mr-2" />
                  Odhlásiť sa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - clean bottom bar */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 safe-bottom">
        <div className="bento-card !rounded-2xl px-1.5 py-1.5">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Admin</span>
              </Link>
            )}
            <Link
              to="/profile"
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                location.pathname === '/profile'
                  ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.5)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Profil</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
