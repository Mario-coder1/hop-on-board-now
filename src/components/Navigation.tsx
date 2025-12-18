import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, PlusCircle, User, LogOut, Car, MapPin } from 'lucide-react';
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
  const { profile, signOut, updateRole } = useAuth();
  const location = useLocation();

  const isDriver = profile?.selected_role === 'driver';

  const navItems = isDriver
    ? [
        { path: '/', icon: Home, label: 'Domov' },
        { path: '/create-ride', icon: PlusCircle, label: 'Nová jazda' },
        { path: '/my-rides', icon: Car, label: 'Moje jazdy' },
      ]
    : [
        { path: '/', icon: Home, label: 'Domov' },
        { path: '/search', icon: Search, label: 'Hľadať' },
        { path: '/my-trips', icon: MapPin, label: 'Moje cesty' },
      ];

  const handleSwitchRole = () => {
    updateRole(isDriver ? 'passenger' : 'driver');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-border/50"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(190_80%_45%)] flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">
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
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Badge - visible on all screens */}
            <button
              onClick={handleSwitchRole}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isDriver
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-accent/10 text-accent hover:bg-accent/20'
              }`}
            >
              {isDriver ? <Car className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{isDriver ? 'Vodič' : 'Cestujúci'}</span>
              <span className="xs:hidden">{isDriver ? 'V' : 'C'}</span>
            </button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.rating?.toFixed(1)} ⭐ · {profile?.total_rides} jázd
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Môj profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSwitchRole} className="cursor-pointer">
                  {isDriver ? (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Prepnúť na cestujúceho
                    </>
                  ) : (
                    <>
                      <Car className="w-4 h-4 mr-2" />
                      Prepnúť na vodiča
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Odhlásiť sa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border/50 px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
          {/* Role Switch Button */}
          <button
            onClick={handleSwitchRole}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              isDriver
                ? 'text-accent hover:bg-accent/10'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            {isDriver ? <User className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            <span className="text-[10px]">{isDriver ? 'Cestujúci' : 'Vodič'}</span>
          </button>
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              location.pathname === '/profile'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profil</span>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;