import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, MessageCircle, Phone, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  phoneNumber?: string;
}

export default function WhatsAppSetupGuide({ isOpen, onClose, onComplete, phoneNumber }: WhatsAppSetupGuideProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  
  const sandboxNumber = "+14155238886";
  const joinMessage = "join sitenest";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const openWhatsApp = () => {
    const whatsappUrl = `https://wa.me/${sandboxNumber.replace('+', '')}?text=${encodeURIComponent(joinMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-sitenest-blue">
            <MessageCircle className="w-6 h-6" />
            <span>WhatsApp Verification Setup</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Progress */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-sitenest-blue' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-sitenest-blue text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Join Sandbox</span>
            </div>
            
            <div className="w-8 h-px bg-gray-300"></div>
            
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-sitenest-blue' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-sitenest-blue text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Verify</span>
            </div>
          </div>

          {/* Step 1: Join Sandbox */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Join WhatsApp Sandbox</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  To receive verification codes via WhatsApp, you need to join our Twilio Sandbox first.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Send this message:</h4>
                  <div className="flex items-center space-x-2 bg-white p-3 rounded border">
                    <code className="flex-1 text-sm font-mono">{joinMessage}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(joinMessage)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">To this number:</h4>
                  <div className="flex items-center space-x-2 bg-white p-3 rounded border">
                    <Phone className="w-4 h-4 text-green-600" />
                    <code className="flex-1 text-sm font-mono">{sandboxNumber}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(sandboxNumber)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={openWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open WhatsApp & Send Message
                  </Button>
                  
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="w-full"
                  >
                    I've sent the message
                  </Button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• This is a one-time setup for Twilio's WhatsApp sandbox</p>
                  <p>• You'll receive a confirmation message when successfully joined</p>
                  <p>• After joining, you can receive verification codes via WhatsApp</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Verification Ready */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Ready for Verification!</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Great! You should have received a confirmation message from WhatsApp. 
                  Now you can receive verification codes for your SiteNest account.
                </p>

                {phoneNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Your Phone Number:</h4>
                    <p className="text-sm font-mono">{phoneNumber}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Verification codes will be sent to this WhatsApp number
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={onComplete}
                    className="w-full bg-sitenest-blue hover:bg-blue-700"
                  >
                    Continue to Verification
                  </Button>
                  
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Step 1
                  </Button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Keep WhatsApp open to receive your verification code</p>
                  <p>• The code will arrive within a few seconds</p>
                  <p>• If you don't receive it, try resending from the verification screen</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Close Button */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
