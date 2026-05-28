import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useRideNotifications } from "@/hooks/useRideNotifications";
import { useNotificationAlert } from "@/hooks/useNotificationAlert";
import { useAutoSubscribePush } from "@/hooks/useAutoSubscribePush";
import { usePageViewTracking } from "@/hooks/usePageViewTracking";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Index from "./pages/Index";
import ActiveRideFAB from "./components/ActiveRideFAB";
import IOSInstallPrompt from "./components/IOSInstallPrompt";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner";
import { WelcomeOnboardingDialog } from "./components/WelcomeOnboardingDialog";

// Lazy-load all non-critical routes for faster initial load
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const PassengerDashboard = lazy(() => import("./pages/PassengerDashboard"));
const CreateRide = lazy(() => import("./pages/CreateRide"));
const SearchRides = lazy(() => import("./pages/SearchRides"));
const RideDetail = lazy(() => import("./pages/RideDetail"));
const MyRides = lazy(() => import("./pages/MyRides"));
const MyTrips = lazy(() => import("./pages/MyTrips"));
const Profile = lazy(() => import("./pages/Profile"));
const TrackRide = lazy(() => import("./pages/TrackRide"));
const ManagePassengers = lazy(() => import("./pages/ManagePassengers"));
const Install = lazy(() => import("./pages/Install"));
const Admin = lazy(() => import("./pages/Admin"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const GDPR = lazy(() => import("./pages/GDPR"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicChat = lazy(() => import("./pages/PublicChat"));
const TopDrivers = lazy(() => import("./pages/TopDrivers"));
const Komunity = lazy(() => import("./pages/Komunity"));
const RidesIndex = lazy(() => import("./pages/RidesIndex"));
const CityOrPairRoute = lazy(() => import("./pages/CityOrPairRoute"));
const Co2Calculator = lazy(() => import("./pages/Co2Calculator"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Wallet = lazy(() => import("./pages/Wallet"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Component to handle global notifications
const NotificationListener = () => {
  useRideNotifications();
  useNotificationAlert();
  useAutoSubscribePush();
  usePageViewTracking();
  return null;
};

const AppRoutes = () => {
  return (
    <>
      <a href="#main-content" className="skip-to-content">Preskočiť na obsah</a>
      <PaymentTestModeBanner />
      <NotificationListener />
      <ActiveRideFAB />
      <IOSInstallPrompt />
      <WelcomeOnboardingDialog />
      <div id="main-content">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
            <Route path="/passenger" element={<ProtectedRoute><PassengerDashboard /></ProtectedRoute>} />
            <Route path="/create-ride" element={<ProtectedRoute><CreateRide /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchRides /></ProtectedRoute>} />
            <Route path="/ride/:id" element={<ProtectedRoute><RideDetail /></ProtectedRoute>} />
            <Route path="/my-rides" element={<ProtectedRoute><MyRides /></ProtectedRoute>} />
            <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
            <Route path="/track/:requestId" element={<ProtectedRoute><TrackRide /></ProtectedRoute>} />
            <Route path="/manage-passengers/:rideId" element={<ProtectedRoute><ManagePassengers /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><PublicChat /></ProtectedRoute>} />
            <Route path="/top-drivers" element={<ProtectedRoute><TopDrivers /></ProtectedRoute>} />
            <Route path="/komunity" element={<ProtectedRoute><Komunity /></ProtectedRoute>} />
            <Route path="/co2" element={<Co2Calculator />} />
            <Route path="/install" element={<Install />} />
            <Route path="/jazdy" element={<RidesIndex />} />
            <Route path="/jazdy/:slug" element={<CityOrPairRoute />} />
            <Route path="/jazdy/:slug/:variant" element={<CityOrPairRoute />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/gdpr" element={<GDPR />} />
            <Route path="/checkout/return" element={<ProtectedRoute><CheckoutReturn /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppErrorBoundary>
                <AppRoutes />
              </AppErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
