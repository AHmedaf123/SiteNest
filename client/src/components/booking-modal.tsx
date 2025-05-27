import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function BookingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    checkIn: "",
    checkOut: "",
    roomType: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    const handleOpenBookingModal = (event: any) => {
      setIsOpen(true);
      if (event.detail?.roomId) {
        setSelectedRoomId(event.detail.roomId);
        setFormData(prev => ({ ...prev, roomType: event.detail.roomId }));
      }
    };

    window.addEventListener('openBookingModal', handleOpenBookingModal);
    return () => window.removeEventListener('openBookingModal', handleOpenBookingModal);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.phone || !formData.cnic || !formData.checkIn || !formData.checkOut) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate dates
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      toast({
        title: "Invalid Check-in Date",
        description: "Check-in date cannot be in the past.",
        variant: "destructive"
      });
      return;
    }

    if (checkOutDate <= checkInDate) {
      toast({
        title: "Invalid Check-out Date",
        description: "Check-out date must be after check-in date.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Booking Submitted!",
      description: "We'll contact you shortly to confirm your reservation.",
    });

    // Reset form and close modal
    setFormData({
      name: "",
      phone: "",
      cnic: "",
      checkIn: "",
      checkOut: "",
      roomType: ""
    });
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedRoomId("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Book Your Stay</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC/ID Number *</Label>
            <Input
              id="cnic"
              value={formData.cnic}
              onChange={(e) => handleInputChange('cnic', e.target.value)}
              placeholder="Enter your CNIC/ID"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in *</Label>
              <Input
                id="checkIn"
                type="date"
                value={formData.checkIn}
                onChange={(e) => handleInputChange('checkIn', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out *</Label>
              <Input
                id="checkOut"
                type="date"
                value={formData.checkOut}
                onChange={(e) => handleInputChange('checkOut', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roomType">Preferred Room *</Label>
            <Select value={formData.roomType} onValueChange={(value) => handleInputChange('roomType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a room type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="714">Room 714 - Luxury Studio</SelectItem>
                <SelectItem value="503">Room 503 - Cozy One-Bed</SelectItem>
                <SelectItem value="301">Room 301 - Family Two-Bed</SelectItem>
                <SelectItem value="901">Room 901 - Luxury Three-Bed</SelectItem>
                <SelectItem value="205">Room 205 - Downtown Loft</SelectItem>
                <SelectItem value="802">Room 802 - Waterfront View</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-brand-coral hover:bg-red-600"
            >
              Continue Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
