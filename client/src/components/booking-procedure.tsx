import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CreditCard, MessageCircle, CheckCircle, ArrowRight, Phone, Mail, MapPin, Search, FileText, Bot, Banknote, MessageSquare, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";

interface AvailabilityStatus {
  isAvailable: boolean;
  isLoading: boolean;
  lastChecked: Date | null;
  isReserved: boolean;
  reservationExpiry: Date | null;
  reservationTimeLeft: number; // in minutes
}

export default function BookingProcedure() {
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>({
    isAvailable: true, // Default to available
    isLoading: false,
    lastChecked: null,
    isReserved: false,
    reservationExpiry: null,
    reservationTimeLeft: 0
  });
  
  const { isAuthenticated } = useRealAuth();
  const { toast } = useToast();

  // Check today's availability on component mount
  useEffect(() => {
    checkTodaysAvailability();
    checkActiveReservations();

    // Listen for reservation created events
    const handleReservationCreated = () => {
      checkActiveReservations();
    };

    window.addEventListener('reservationCreated', handleReservationCreated);
    return () => window.removeEventListener('reservationCreated', handleReservationCreated);
  }, []);

  // Timer for reservation countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (availabilityStatus.isReserved && availabilityStatus.reservationExpiry) {
      interval = setInterval(() => {
        const now = new Date();
        const timeLeft = Math.max(0, Math.floor((availabilityStatus.reservationExpiry!.getTime() - now.getTime()) / (1000 * 60)));

        if (timeLeft <= 0) {
          // Reservation expired
          setAvailabilityStatus(prev => ({
            ...prev,
            isReserved: false,
            reservationExpiry: null,
            reservationTimeLeft: 0,
            isAvailable: true
          }));
          checkTodaysAvailability(); // Refresh availability
        } else {
          setAvailabilityStatus(prev => ({
            ...prev,
            reservationTimeLeft: timeLeft
          }));
        }
      }, 60000); // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [availabilityStatus.isReserved, availabilityStatus.reservationExpiry]);

  const checkActiveReservations = async () => {
    try {
      const response = await fetch('/api/reservations/active', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const reservations = await response.json();
        const activeReservation = reservations.find((r: any) =>
          new Date(r.expiresAt) > new Date()
        );

        if (activeReservation) {
          setAvailabilityStatus(prev => ({
            ...prev,
            isReserved: true,
            reservationExpiry: new Date(activeReservation.expiresAt),
            reservationTimeLeft: Math.floor((new Date(activeReservation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60)),
            isAvailable: false
          }));
        }
      }
    } catch (error) {
      console.error('Failed to check active reservations:', error);
    }
  };

  const checkTodaysAvailability = async () => {
    setAvailabilityStatus(prev => ({ ...prev, isLoading: true }));

    try {
      // Always show as available - we only care about reservations, not bookings
      // The button will only toggle between "Book Now" and "Reserved for X minutes"
      setAvailabilityStatus(prev => ({
        ...prev,
        isAvailable: true,
        isLoading: false,
        lastChecked: new Date()
      }));
    } catch (error) {
      console.error('Failed to check availability:', error);
      // Default to available
      setAvailabilityStatus(prev => ({
        ...prev,
        isAvailable: true,
        isLoading: false,
        lastChecked: new Date()
      }));
    }
  };

  const handleBookNowClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start your booking process.",
        variant: "default"
      });

      // Scroll to top and trigger auth modal (handled by parent component)
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Trigger a custom event that the parent component can listen to
      const event = new CustomEvent('requestAuthentication', {
        detail: { source: 'booking-procedure' }
      });
      window.dispatchEvent(event);
      return;
    }

    // Open booking modal
    const event = new CustomEvent('openBookingModal', {
      detail: { roomId: 'any', apartmentId: 0 }
    });
    window.dispatchEvent(event);
  };



  const openWhatsApp = () => {
    const message = encodeURIComponent("Hi! I'm interested in booking a room at SiteNest. Can you help me with availability and pricing?");
    window.open(`https://wa.me/+923115197087?text=${message}`, '_blank');
  };

  const bookingSteps = [
    {
      icon: Home,
      title: "Browse & Select",
      description: "Explore our premium apartments, check amenities, and choose your preferred room with real-time availability.",
      keywords: "apartment booking, room selection, availability check",
      gradient: "from-sitenest-primary to-sitenest-secondary",
      bgColor: "bg-gradient-to-br from-sitenest-primary/5 to-sitenest-secondary/5",
      borderColor: "border-sitenest-primary/20"
    },
    {
      icon: FileText,
      title: "Submit Request",
      description: "Fill out our simple booking form with your check-in/check-out dates to start your reservation process.",
      keywords: "booking form, reservation request, check-in dates",
      gradient: "from-sitenest-secondary to-sitenest-primary",
      bgColor: "bg-gradient-to-br from-sitenest-secondary/5 to-sitenest-primary/5",
      borderColor: "border-sitenest-secondary/20"
    },
    {
      icon: Bot,
      title: "AI Verification",
      description: "Our intelligent chatbot verifies availability, confirms pricing, and asks qualification questions.",
      keywords: "booking verification, AI assistant, pricing confirmation",
      gradient: "from-sitenest-primary to-sitenest-hover-button",
      bgColor: "bg-gradient-to-br from-sitenest-primary/5 to-sitenest-hover-button/5",
      borderColor: "border-sitenest-primary/20"
    },
    {
      icon: Banknote,
      title: "Secure Payment",
      description: "Send advance payment (PKR 500-2000) under 45 minutes via EasyPaisa so that we actually book apartment for you.",
      keywords: "advance payment, EasyPaisa, booking confirmation",
      gradient: "from-sitenest-secondary to-sitenest-hover-card",
      bgColor: "bg-gradient-to-br from-sitenest-secondary/5 to-sitenest-hover-card/5",
      borderColor: "border-sitenest-secondary/20"
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Confirmation",
      description: "Share payment screenshot on WhatsApp and receive instant booking confirmation with check-in details.",
      keywords: "WhatsApp confirmation, payment verification, booking details",
      gradient: "from-green-500 to-green-600",
      bgColor: "bg-gradient-to-br from-green-50 to-emerald-50",
      borderColor: "border-green-200"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-sitenest-background to-sitenest-warm-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-10 right-20 w-40 h-40 bg-sitenest-primary/5 rounded-full"></div>
      <div className="absolute bottom-20 left-20 w-32 h-32 bg-sitenest-secondary/5 rounded-full"></div>
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="section-heading mb-6 text-primary">
            Simple Booking Procedure
          </h2>
          <p className="body-elegant text-xl text-secondary max-w-3xl mx-auto mb-8">
            Experience our streamlined, secure, and user-friendly apartment booking process. From selection to confirmation, we've made luxury accommodation booking effortless in Islamabad's premier location.
          </p>
          
          {/* Dynamic Booking Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {availabilityStatus.isLoading ? (
              <Button disabled className="px-8 py-4 text-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Checking Availability...
              </Button>
            ) : availabilityStatus.isReserved ? (
              <Button
                disabled
                className="bg-orange-500 text-white px-8 py-4 text-lg font-semibold cursor-not-allowed"
              >
                <Clock className="mr-2 h-5 w-5" />
                Reserved for {availabilityStatus.reservationTimeLeft} minutes
              </Button>
            ) : (
              <Button
                onClick={handleBookNowClick}
                className="bg-sitenest-primary hover:bg-sitenest-hover-button text-white px-8 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Book Now - Available Today
              </Button>
            )}
            
            <Button
              onClick={openWhatsApp}
              variant="outline"
              className="border-sitenest-primary text-sitenest-primary hover:bg-sitenest-primary hover:text-white px-6 py-4 text-lg transition-all duration-300"
            >
              <Phone className="mr-2 h-5 w-5" />
              WhatsApp: 0311-5197087
            </Button>
          </div>

          {availabilityStatus.lastChecked && (
            <p className="text-sm text-secondary">
              Last availability check: {availabilityStatus.lastChecked.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Booking Steps */}
        <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 gap-8 mb-16">
          {bookingSteps.map((step, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className={`h-full hover:shadow-xl transition-all duration-300 group relative overflow-hidden ${step.bgColor} ${step.borderColor} border-2`}>
                <CardContent className="p-6 text-center relative z-10">
                  {/* Icon with gradient background */}
                  <div className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <step.icon className="h-10 w-10 text-white" />
                  </div>

                  {/* Step number badge */}
                  <div className="relative mb-4">
                    <Badge className={`bg-gradient-to-r ${step.gradient} text-white px-3 py-1 text-sm font-semibold shadow-md`}>
                      Step {index + 1}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold font-playfair text-xl mb-3 text-primary group-hover:text-sitenest-primary transition-colors duration-300">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-secondary text-sm leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>

                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-sitenest-primary"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-sitenest-secondary"></div>
                </div>
              </Card>
              
              {/* Enhanced Arrow connector (hidden on last item) */}
              {index < bookingSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-20">
                  <div className="bg-white rounded-full p-2 shadow-lg border-2 border-sitenest-primary/20">
                    <ArrowRight className="h-5 w-5 text-sitenest-primary" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Detailed Information Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Payment Information */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="glass-card h-full border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-6 w-6 text-sitenest-primary mr-3" />
                  <h3 className="font-semibold font-playfair text-lg text-primary">Payment Details</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">Account Title:</span>
                    <span className="font-medium">Abdullah Sultan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Bank:</span>
                    <span className="font-medium">EasyPaisa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Account Number:</span>
                    <span className="font-medium">0311-5197087</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Advance Amount:</span>
                    <span className="font-medium text-sitenest-primary">PKR 500-2000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Card className="glass-card h-full border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <MessageCircle className="h-6 w-6 text-sitenest-primary mr-3" />
                  <h3 className="font-semibold font-playfair text-lg text-primary">Contact Support</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-secondary mr-2" />
                    <span>+92-311-5197087</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-secondary mr-2" />
                    <span>mahmadafzal880@gmail.com</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-secondary mr-2" />
                    <span>Bahria Enclave, Islamabad</span>
                  </div>
                  <div className="mt-4">
                    <Badge className="bg-green-100 text-green-800">
                      24/7 WhatsApp Support
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Booking Guarantee */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Card className="glass-card h-full border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                  <h3 className="font-semibold font-playfair text-lg text-primary">Our Guarantee</h3>
                </div>
                <div className="space-y-2 text-sm text-secondary">
                  <p>✓ Instant booking confirmation</p>
                  <p>✓ Secure payment processing</p>
                  <p>✓ Real-time availability updates</p>
                  <p>✓ 24/7 customer support</p>
                  <p>✓ Flexible cancellation policy</p>
                </div>
                <div className="mt-4">
                  <Badge className="bg-sitenest-secondary text-sitenest-primary">
                    Trusted by 1000+ Guests
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
