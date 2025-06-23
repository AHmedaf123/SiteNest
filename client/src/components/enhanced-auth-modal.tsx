import { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Phone, MapPin, CreditCard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";
import Logo from "@/components/ui/logo";

interface EnhancedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (isNewUser?: boolean) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  cnic: string;
  phone: string;
  country: string;
  address: string;
}

export default function EnhancedAuthModal({ isOpen, onClose, onAuthSuccess }: EnhancedAuthModalProps) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    cnic: "",
    phone: "",
    country: "Pakistan",
    address: ""
  });

  const { toast } = useToast();
  const { login, signup } = useRealAuth();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (authMode === 'signup') {
      const { firstName, lastName, email, password, confirmPassword, cnic, phone, address } = formData;

      if (!firstName.trim() || firstName.length < 2) {
        toast({
          title: "Validation Error",
          description: "First name must be at least 2 characters long.",
          variant: "destructive"
        });
        return false;
      }

      if (!lastName.trim() || lastName.length < 2) {
        toast({
          title: "Validation Error",
          description: "Last name must be at least 2 characters long.",
          variant: "destructive"
        });
        return false;
      }

      if (!email.includes('@')) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return false;
      }

      if (password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive"
        });
        return false;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords do not match.",
          variant: "destructive"
        });
        return false;
      }

      if (!cnic.match(/^\d{13}$/)) {
        toast({
          title: "Validation Error",
          description: "CNIC must be exactly 13 digits.",
          variant: "destructive"
        });
        return false;
      }

      if (!phone.match(/^(\+92|0)?[0-9]{10,11}$/)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid Pakistani phone number (e.g., 03001234567 or +923001234567).",
          variant: "destructive"
        });
        return false;
      }

      if (!address.trim() || address.length < 5) {
        toast({
          title: "Validation Error",
          description: "Address must be at least 5 characters long.",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        const result = await signup({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          cnic: formData.cnic,
          phone: formData.phone,
          country: formData.country,
          address: formData.address
        });

        if (result.success) {
          // Don't show toast here - let the parent handle it
          onAuthSuccess(true); // Pass true for new user
          onClose();
        } else {
          toast({
            title: "Signup Failed",
            description: result.error || "Something went wrong. Please try again.",
            variant: "destructive"
          });
        }

      } else if (authMode === 'signin') {
        const result = await login(formData.email, formData.password);

        if (result.success) {
          // Don't show toast here - let the parent handle it
          onAuthSuccess(false); // Pass false for existing user
          onClose();
        } else {
          toast({
            title: "Login Failed",
            description: result.error || "Invalid email or password.",
            variant: "destructive"
          });
        }

      } else if (authMode === 'forgot') {
        // TODO: Implement forgot password functionality
        toast({
          title: "Feature Coming Soon",
          description: "Password reset functionality will be available soon.",
        });
        setAuthMode('signin');
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  const getModalTitle = () => {
    switch (authMode) {
      case 'signup': return 'Create Your SiteNest Account';
      case 'forgot': return 'Reset Your Password';
      default: return 'Welcome Back to SiteNest';
    }
  };

  const getSubmitText = () => {
    if (isLoading) return 'Please wait...';
    switch (authMode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Send Reset Email';
      default: return 'Sign In';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <Logo variant="icon" size="md" showText={true} textClassName="text-sitenest-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-sitenest-primary">
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Google Sign-In Button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full border-2 border-gray-300 hover:border-sitenest-primary"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Name fields for signup */}
          {authMode === 'signup' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Doe"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email field */}
          {authMode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          {/* Password fields */}
          {authMode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm password for signup */}
          {authMode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          {/* Additional fields for signup */}
          {authMode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cnic">CNIC (13 digits) *</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="cnic"
                    value={formData.cnic}
                    onChange={(e) => handleInputChange('cnic', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    placeholder="1234567890123"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (WhatsApp) *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+92 300 1234567"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Verification codes will be sent via WhatsApp
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Pakistan"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Your complete address"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <Button
            type="submit"
            className="w-full bg-sitenest-primary hover:bg-sitenest-hover-button text-white"
            disabled={isLoading}
          >
            {getSubmitText()}
          </Button>

          {/* Mode switching */}
          <div className="text-center space-y-2">
            {authMode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-sm text-sitenest-primary hover:underline"
                >
                  Forgot your password?
                </button>
                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-sitenest-primary hover:underline font-semibold"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {authMode === 'signup' && (
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-sitenest-primary hover:underline font-semibold"
                >
                  Sign in
                </button>
              </div>
            )}

            {authMode === 'forgot' && (
              <div className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-sitenest-primary hover:underline font-semibold"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
