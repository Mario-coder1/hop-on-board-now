import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRideNotifications } from "@/hooks/useRideNotifications";
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
import NotFound from "./pages/NotFound";

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
  return null;
};

const AppRoutes = () => {
  return (
    <>
      <NotificationListener />
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
        <Route path="/install" element={<Install />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;