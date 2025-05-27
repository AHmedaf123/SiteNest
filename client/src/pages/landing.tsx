import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, User, Lock, Mail } from "lucide-react";
import AuthModal from "@/components/auth-modal";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { signIn } = useSimpleAuth();

  const handleAuthSuccess = (userData: any) => {
    signIn(userData);
    setIsAuthModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-coral to-brand-teal flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Home className="text-brand-coral text-3xl" />
              <h1 className="text-3xl font-bold text-primary">Side Nest</h1>
            </div>
            <CardTitle className="text-xl text-secondary">
              Welcome to your home away from home
            </CardTitle>
            <p className="text-sm text-secondary mt-2">
              Sign in to access premium apartment rentals and personalized booking experience
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full bg-brand-coral hover:bg-red-600 text-white py-3 text-lg font-semibold"
            >
              <User className="mr-2" />
              Sign In / Sign Up
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-secondary">Features</span>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 text-secondary">
                <Lock className="text-brand-teal w-4 h-4" />
                <span>Secure authentication and data protection</span>
              </div>
              <div className="flex items-center space-x-3 text-secondary">
                <Mail className="text-brand-teal w-4 h-4" />
                <span>Email notifications and booking confirmations</span>
              </div>
              <div className="flex items-center space-x-3 text-secondary">
                <Home className="text-brand-teal w-4 h-4" />
                <span>Access to premium apartment listings</span>
              </div>
            </div>
            
            <div className="pt-4 text-center">
              <p className="text-xs text-secondary">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}