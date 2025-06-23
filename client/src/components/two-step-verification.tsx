import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";
import { Mail, Phone, Shield, CheckCircle, Clock, RefreshCw, MessageCircle } from "lucide-react";
import WhatsAppSetupGuide from "./whatsapp-setup-guide";

interface TwoStepVerificationProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function TwoStepVerification({ isOpen, onComplete, onSkip }: TwoStepVerificationProps) {
  const [step, setStep] = useState<'email' | 'phone'>('email');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showWhatsAppGuide, setShowWhatsAppGuide] = useState(false);

  const { toast } = useToast();
  const { user, verifyEmail, verifyPhone, resendVerification } = useRealAuth();

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Check if user is already verified
  useEffect(() => {
    if (user) {
      setEmailVerified(user.isEmailVerified || false);
      setPhoneVerified(user.isPhoneVerified || false);

      // Only auto-complete if modal is open and user becomes verified during the process
      if (isOpen && user.isEmailVerified && user.isPhoneVerified) {
        onComplete();
      } else if (user.isEmailVerified && !user.isPhoneVerified) {
        setStep('phone');
      }
    }
  }, [user, onComplete, isOpen]);

  // Don't render if user is already fully verified or modal is not open
  if (!isOpen || (user && user.isEmailVerified && user.isPhoneVerified)) {
    return null;
  }

  const handleEmailVerification = async () => {
    if (emailCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const result = await verifyEmail(emailCode);

    if (result.success) {
      setEmailVerified(true);
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified.",
      });

      // Move to phone verification if not already verified
      if (!phoneVerified) {
        setStep('phone');
      } else {
        onComplete();
      }
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Invalid verification code.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handlePhoneVerification = async () => {
    if (phoneCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const result = await verifyPhone(phoneCode);

    if (result.success) {
      setPhoneVerified(true);
      toast({
        title: "Phone Verified!",
        description: "Your phone number has been successfully verified.",
      });
      onComplete();
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Invalid verification code.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    const result = await resendVerification(step);

    if (result.success) {
      toast({
        title: "Code Sent",
        description: `A new verification code has been sent to your ${step}.`,
      });
      setResendCooldown(60); // 60 second cooldown
    } else {
      toast({
        title: "Resend Failed",
        description: result.error || "Failed to resend verification code.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-sitenest-blue rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-sitenest-blue">
            Two-Step Verification
          </CardTitle>
          <p className="text-gray-600">
            Secure your account with two-step verification
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress indicators */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'email' ? 'text-sitenest-blue' : emailVerified ? 'text-green-600' : 'text-gray-400'}`}>
              {emailVerified ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">Email</span>
            </div>

            <div className="w-8 h-px bg-gray-300"></div>

            <div className={`flex items-center space-x-2 ${step === 'phone' ? 'text-sitenest-blue' : phoneVerified ? 'text-green-600' : 'text-gray-400'}`}>
              {phoneVerified ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Phone className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">Phone</span>
            </div>
          </div>

          {/* Email Verification Step */}
          {step === 'email' && !emailVerified && (
            <div className="space-y-4">
              <div className="text-center">
                <Mail className="w-12 h-12 text-sitenest-blue mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Verify Your Email</h3>
                <p className="text-gray-600 text-sm">
                  We've sent a 6-digit code to <strong>{user?.email}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailCode">Enter 6-digit code</Label>
                <Input
                  id="emailCode"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleEmailVerification}
                className="w-full bg-sitenest-blue hover:bg-blue-700"
                disabled={isLoading || emailCode.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </Button>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Clock className="w-4 h-4 mr-1" />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Phone Verification Step */}
          {step === 'phone' && !phoneVerified && (
            <div className="space-y-4">
              <div className="text-center">
                <Phone className="w-12 h-12 text-sitenest-blue mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Verify Your WhatsApp</h3>
                <p className="text-gray-600 text-sm">
                  We've sent a 6-digit code to <strong>{user?.phone}</strong> via WhatsApp
                </p>
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>First time?</strong> Send "join sitenest" to <strong>+14155238886</strong> on WhatsApp to enable verification messages.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneCode">Enter 6-digit code</Label>
                <Input
                  id="phoneCode"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handlePhoneVerification}
                className="w-full bg-sitenest-blue hover:bg-blue-700"
                disabled={isLoading || phoneCode.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify Phone"}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-sm"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <Clock className="w-4 h-4 mr-1" />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Resend WhatsApp Code
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setShowWhatsAppGuide(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  WhatsApp Setup Help
                </Button>
              </div>
            </div>
          )}

          {/* Completion State */}
          {emailVerified && phoneVerified && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold text-green-600">
                Verification Complete!
              </h3>
              <p className="text-gray-600 text-sm">
                Your account is now fully verified and secure.
              </p>
              <Button
                onClick={onComplete}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Continue to SiteNest
              </Button>
            </div>
          )}

          {/* Skip option (if provided) */}
          {onSkip && !emailVerified && !phoneVerified && (
            <div className="text-center pt-4 border-t">
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now (not recommended)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Setup Guide */}
      <WhatsAppSetupGuide
        isOpen={showWhatsAppGuide}
        onClose={() => setShowWhatsAppGuide(false)}
        onComplete={() => setShowWhatsAppGuide(false)}
        phoneNumber={user?.phone || undefined}
      />
    </div>
  );
}
