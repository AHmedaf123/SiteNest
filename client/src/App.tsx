import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRealAuth, AuthProvider } from "@/hooks/useRealAuth";
import ErrorBoundary from "@/components/error-boundary";
import { BookingProvider } from "@/contexts/BookingContext";
import Home from "@/pages/home";
import Calendar from "@/pages/calendar";
import UnifiedAdmin from "@/pages/unified-admin";
import Apartments from "@/pages/apartments";
import ApartmentDetail from "@/pages/apartment-detail";
import Landing from "@/pages/landing";
import ProfileDashboard from "@/components/profile-dashboard";
import TwoStepVerification from "@/components/two-step-verification";
import NotFound from "@/pages/not-found";
import Careers from "@/pages/careers";
import AffiliateDashboard from "@/pages/affiliate-dashboard";
import { useState } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useRealAuth();
  const [showVerification, setShowVerification] = useState(false);

  // Check if user needs verification after login
  const needsVerification = user && (!user.isEmailVerified || !user.isPhoneVerified);

  const handleVerificationComplete = () => {
    setShowVerification(false);
  };

  return (
    <>
      <Switch>
        {/* Public routes - accessible to everyone */}
        <Route path="/" component={Home} />
        <Route path="/apartments" component={Apartments} />
        <Route path="/apartment/:id" component={ApartmentDetail} />
        <Route path="/landing" component={Landing} />
        <Route path="/careers" component={Careers} />

        {/* Protected routes - require authentication */}
        {isAuthenticated ? (
          <>
            <Route path="/calendar" component={Calendar} />
            <Route path="/admin" component={UnifiedAdmin} />
            <Route path="/affiliate-dashboard" component={AffiliateDashboard} />
            <Route path="/profile" component={ProfileDashboard} />
          </>
        ) : (
          // Redirect protected routes to home page for unauthenticated users
          <>
            <Route path="/calendar" component={Home} />
            <Route path="/admin" component={Home} />
            <Route path="/affiliate-dashboard" component={Home} />
            <Route path="/profile" component={Home} />
          </>
        )}

        <Route component={NotFound} />
      </Switch>

      {/* Two-Step Verification Modal */}
      {needsVerification && showVerification && (
        <TwoStepVerification
          isOpen={showVerification}
          onComplete={handleVerificationComplete}
          onSkip={() => setShowVerification(false)}
        />
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <BookingProvider>
              <Toaster />
              <Router />
            </BookingProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
