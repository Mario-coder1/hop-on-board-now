import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRideNotifications } from "@/hooks/useRideNotifications";
import { useNotificationAlert } from "@/hooks/useNotificationAlert";
import { useAutoSubscribePush } from "@/hooks/useAutoSubscribePush";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DriverDashboard from "./pages/DriverDashboard";
import PassengerDashboard from "./pages/PassengerDashboard";
import CreateRide from "./pages/CreateRide";
import SearchRides from "./pages/SearchRides";
import RideDetail from "./pages/RideDetail";
import MyRides from "./pages/MyRides";
import MyTrips from "./pages/MyTrips";
import Profile from "./pages/Profile";
import TrackRide from "./pages/TrackRide";
import ManagePassengers from "./pages/ManagePassengers";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import GDPR from "./pages/GDPR";
import NotFound from "./pages/NotFound";
import PublicChat from "./pages/PublicChat";
import TopDrivers from "./pages/TopDrivers";
import ActiveRideFAB from "./components/ActiveRideFAB";
import IOSInstallPrompt from "./components/IOSInstallPrompt";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Component to handle global notifications
const NotificationListener = () => {
  useRideNotifications();
  useNotificationAlert();
  useAutoSubscribePush();
  return null;
};

const AppRoutes = () => {
  return (
    <>
      <a href="#main-content" className="skip-to-content">Preskočiť na obsah</a>
      <NotificationListener />
      <ActiveRideFAB />
      <IOSInstallPrompt />
      <div id="main-content">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
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
        <Route path="/install" element={<Install />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/gdpr" element={<GDPR />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
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
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;