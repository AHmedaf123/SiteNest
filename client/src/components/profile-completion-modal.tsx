import { useState } from "react";
import { X, User, Phone, MapPin, CreditCard, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ProfileData {
  cnic: string;
  phone: string;
  address: string;
  country: string;
}

export default function ProfileCompletionModal({ isOpen, onClose, onComplete }: ProfileCompletionModalProps) {
  const { completeGoogleProfile } = useRealAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<ProfileData>({
    cnic: "",
    phone: "",
    address: "",
    country: "Pakistan"
  });

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate required fields
    if (!formData.cnic || !formData.phone || !formData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Validate CNIC format (basic validation)
    if (formData.cnic.length !== 13) {
      toast({
        title: "Invalid CNIC",
        description: "CNIC must be 13 digits long.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Validate phone format (Pakistani phone numbers)
    if (!formData.phone.match(/^(\+92|0)?[0-9]{10,11}$/)) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid Pakistani phone number (e.g., 03001234567 or +923001234567).",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await completeGoogleProfile(formData);

      if (result.success) {
        toast({
          title: "Profile Completed!",
          description: "Your profile has been completed successfully.",
        });
        onComplete();
        onClose();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to complete profile.",
          variant: "destructive"
        });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-sitenest-blue" />
            <span>Complete Your Profile</span>
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-gray-600 mb-4">
          Please complete your profile to access all SiteNest features and make bookings.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CNIC */}
          <div className="space-y-2">
            <Label htmlFor="cnic" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>CNIC Number *</span>
            </Label>
            <Input
              id="cnic"
              type="text"
              placeholder="e.g., 1234567890123"
              value={formData.cnic}
              onChange={(e) => handleInputChange('cnic', e.target.value.replace(/\D/g, '').slice(0, 13))}
              maxLength={13}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Phone Number *</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., 03001234567"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Address *</span>
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="Your complete address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              required
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>Country</span>
            </Label>
            <Input
              id="country"
              type="text"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-sitenest-blue hover:bg-blue-700"
            >
              {isLoading ? 'Completing...' : 'Complete Profile'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Skip for Now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
