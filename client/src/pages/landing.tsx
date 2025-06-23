import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, User, Lock, Mail } from "lucide-react";
import EnhancedAuthModal from "@/components/enhanced-auth-modal";
import { useRealAuth } from "@/hooks/useRealAuth";
import { AuthLogo } from "@/components/ui/logo";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthSuccess = (isNewUser = false) => {
    setIsAuthModalOpen(false);
    // The useRealAuth hook will handle the authentication state
    // Landing page doesn't need to handle verification flow
  };

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="glass-card shadow-2xl border border-white/20">
          <CardHeader className="text-center pb-8">
            <AuthLogo />
            <CardTitle className="text-xl text-secondary font-playfair">
              Welcome to your home away from home
            </CardTitle>
            <p className="text-sm text-secondary mt-2 leading-relaxed">
              Sign in to access premium hospitality and personalized booking experience in Bahria Enclave, Islamabad
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full btn-premium text-white py-3 text-lg font-semibold font-montserrat"
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
                <Home className="text-sitenest-blue w-4 h-4" />
                <span>Access to premium room listings</span>
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

      <EnhancedAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(isNewUser) => handleAuthSuccess(isNewUser)}
      />
    </div>
  );
}