import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star, MapPin, Bed, Bath, Square, Award, Shield, Heart, Search, Filter, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Hero from "@/components/hero";
import WhyChooseUs from "@/components/why-choose-us";
import Reviews from "@/components/reviews";
import FAQ from "@/components/faq";
import Footer from "@/components/footer";
import Chatbot from "@/components/chatbot";
import BookingModal from "@/components/booking-modal";
import ReviewForm from "@/components/review-form";
import ReviewCarousel from "@/components/review-carousel";
import EnhancedAuthModal from "@/components/enhanced-auth-modal";
import ApartmentBookingButton from "@/components/apartment-booking-button";
import TwoStepVerification from "@/components/two-step-verification";
import BookingProcedure from "@/components/booking-procedure";

import { SimplePricing } from "@/components/comprehensive-pricing";
import ComprehensivePricing from "@/components/comprehensive-pricing";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useToast } from "@/hooks/use-toast";
import type { Apartment } from "@shared/schema";

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: number]: number}>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedroomFilter, setBedroomFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-low");
  const [selectedRoom, setSelectedRoom] = useState<Apartment | null>(null);
  const [selectedRoomImageIndex, setSelectedRoomImageIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  const { isAuthenticated, user } = useRealAuth();
  const { toast } = useToast();

  const { data: apartments = [], isLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
  });

  // Check verification status and show notification
  useEffect(() => {
    if (isAuthenticated && user) {
      const needsVerification = !user.isEmailVerified || !user.isPhoneVerified;
      if (needsVerification) {
        setShowVerificationBanner(true);
        // Show toast notification for new users
        toast({
          title: "Complete Your Account Setup",
          description: "Please complete two-step verification to secure your account and access all features.",
          duration: 8000,
        });
      }
    }
  }, [isAuthenticated, user, toast]);

  // Listen for authentication requests from booking procedure
  useEffect(() => {
    const handleAuthRequest = (event: any) => {
      if (event.detail?.source === 'booking-procedure') {
        setIsAuthModalOpen(true);
      }
    };

    window.addEventListener('requestAuthentication', handleAuthRequest);
    return () => window.removeEventListener('requestAuthentication', handleAuthRequest);
  }, []);

  const nextImage = (apartmentId: number, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [apartmentId]: ((prev[apartmentId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (apartmentId: number, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [apartmentId]: ((prev[apartmentId] || 0) - 1 + totalImages) % totalImages
    }));
  };



  const openBookingModal = (roomNumber: string, apartmentId: number) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a room.",
        variant: "default"
      });
      return;
    }
    const event = new CustomEvent('openBookingModal', {
      detail: { roomId: roomNumber, apartmentId: apartmentId }
    });
    window.dispatchEvent(event);
  };

  const handleAuthSuccess = (isNewUser = false) => {
    setIsAuthModalOpen(false);

    if (isNewUser) {
      // For new users, show verification modal immediately
      setTimeout(() => {
        setShowVerificationModal(true);
      }, 500); // Small delay to allow auth modal to close

      toast({
        title: "Account Created Successfully!",
        description: "Please complete two-step verification to secure your account.",
        duration: 6000,
      });
    } else {
      toast({
        title: "Welcome Back!",
        description: "You can now proceed with booking.",
      });
    }
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    setShowVerificationBanner(false);
    toast({
      title: "Verification Complete!",
      description: "Your account is now fully verified and secure.",
    });
  };

  const openVerificationModal = () => {
    setShowVerificationModal(true);
  };

  const openRoomDetails = (apartment: Apartment) => {
    setSelectedRoom(apartment);
    setSelectedRoomImageIndex(0);
  };

  const closeRoomDetails = () => {
    setSelectedRoom(null);
    setSelectedRoomImageIndex(0);
    setShowReviewForm(false);
  };

  // Filter and sort apartments
  const filteredAndSortedApartments = apartments
    .filter(apartment => {
      const matchesSearch = apartment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           apartment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           apartment.roomNumber.includes(searchTerm);

      const effectivePrice = apartment.discountPercentage && apartment.discountPercentage > 0
                          ? apartment.price * (1 - apartment.discountPercentage / 100)
                          : apartment.price;
      const matchesPrice = priceFilter === "all" ||
                          (priceFilter === "under-15000" && effectivePrice < 15000) ||
                          (priceFilter === "15000-25000" && effectivePrice >= 15000 && effectivePrice <= 25000) ||
                          (priceFilter === "over-25000" && effectivePrice > 25000);

      const matchesBedrooms = bedroomFilter === "all" ||
                             apartment.bedrooms.toString() === bedroomFilter;

      return matchesSearch && matchesPrice && matchesBedrooms;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          const aEffectivePrice = a.discountPercentage && a.discountPercentage > 0
            ? a.price * (1 - a.discountPercentage / 100)
            : a.price;
          const bEffectivePrice = b.discountPercentage && b.discountPercentage > 0
            ? b.price * (1 - b.discountPercentage / 100)
            : b.price;
          return aEffectivePrice - bEffectivePrice;
        case "price-high":
          const aEffectivePriceHigh = a.discountPercentage && a.discountPercentage > 0
            ? a.price * (1 - a.discountPercentage / 100)
            : a.price;
          const bEffectivePriceHigh = b.discountPercentage && b.discountPercentage > 0
            ? b.price * (1 - b.discountPercentage / 100)
            : b.price;
          return bEffectivePriceHigh - aEffectivePriceHigh;
        case "bedrooms":
          return a.bedrooms - b.bedrooms;
        case "name":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-white">
      {/* Verification Banner */}
      {(() => {
        const shouldShowBanner = showVerificationBanner &&
                                isAuthenticated &&
                                user &&
                                (!user.isEmailVerified || !user.isPhoneVerified);

        if (!shouldShowBanner) return null;

        return (
          <div className="bg-gradient-to-r from-sitenest-primary to-sitenest-secondary text-white py-4 px-4 relative shadow-lg">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-sitenest-hover-button" />
                <div>
                  <p className="font-semibold text-white">Complete Your Account Verification</p>
                  <p className="text-sm text-white/80">
                    Secure your account with two-step verification to access all features
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={openVerificationModal}
                  size="sm"
                  className="bg-white text-sitenest-primary hover:bg-sitenest-hover-card font-medium px-4 py-2 shadow-md transition-colors duration-300"
                >
                  Verify Now
                </Button>
                <Button
                  onClick={() => setShowVerificationBanner(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors duration-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      <Hero />

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-primary/5 to-transparent"></div>

      {/* Our Mission Section - Enhanced Content */}
      <section className="py-20 bg-sitenest-warm-white">
        <div className="container mx-auto px-4">
          {/* Mission Statement */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-12 relative shadow-lg">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-16 bg-sitenest-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">❝</span>
                </div>
              </div>
              <h3 className="text-2xl font-semibold font-playfair mb-6 text-primary pt-4">Our Mission</h3>
              <p className="text-lg text-secondary leading-relaxed">
                To redefine hospitality in Pakistan's capital by creating extraordinary experiences that transform every stay into a cherished memory. At SiteNest, we believe that true luxury isn't just about premium amenities—it's about the feeling of belonging. We've crafted each space to embody the perfect harmony between Pakistan's legendary hospitality and international standards of comfort, creating a home where global travelers can experience the authentic warmth of Islamabad while enjoying world-class luxury.
              </p>
            </div>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-20 right-10 w-32 h-32 bg-sitenest-blue/5 rounded-full"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-brand-teal/5 rounded-full"></div>
      </section>

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-secondary/5 to-transparent"></div>

      {/* Featured Rooms Section */}
      <section id="apartments" className="py-24 bg-gradient-to-br from-white to-sitenest-warm-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-heading mb-6 text-primary">Featured Rooms</h2>
            <p className="body-elegant text-xl text-secondary max-w-2xl mx-auto">Discover luxury living with premium amenities, stunning city views, and exceptional comfort in Bahria Enclave, Islamabad</p>
          </div>

          {/* Filters Section */}
          <div className="mb-12 p-6 bg-light rounded-xl shadow-lg">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search apartments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-600">Filters:</span>
                </div>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Price Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under-15000">Under PKR 15,000</SelectItem>
                    <SelectItem value="15000-25000">PKR 15,000 - 25,000</SelectItem>
                    <SelectItem value="over-25000">Over PKR 25,000</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1">1 Bed</SelectItem>
                    <SelectItem value="2">2 Beds</SelectItem>
                    <SelectItem value="3">3 Beds</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="bedrooms">Bedrooms</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Apartments Grid */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
              </div>
            </div>
          ) : filteredAndSortedApartments.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-2xl font-semibold text-gray-600 mb-4">No apartments found</h3>
              <p className="text-gray-500">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAndSortedApartments.map((apartment, index) => {
                // Create unique image array, avoiding duplication of main image
                const allImages = apartment.images && apartment.images.length > 0
                  ? apartment.images.filter(Boolean)
                  : [apartment.imageUrl].filter(Boolean);

                const currentImg = currentImageIndex[apartment.id] || 0;

                return (
                  <Card
                    key={apartment.id}
                    className="glass-card rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 animate-premium-hover animate-slide-up cursor-pointer border border-white/20"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => openRoomDetails(apartment)}
                  >
                    <div className="relative overflow-hidden rounded-t-xl h-64">
                      <img
                        src={allImages[currentImg] || apartment.imageUrl}
                        alt={apartment.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                      {allImages.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage(apartment.id, allImages.length);
                            }}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(apartment.id, allImages.length);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            {allImages.map((_, imgIndex) => (
                              <div
                                key={imgIndex}
                                className={`w-2 h-2 rounded-full ${
                                  imgIndex === currentImg ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      <Badge className="absolute top-2 left-2 bg-sitenest-secondary text-white">
                        Available
                      </Badge>
                    </div>

                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-primary">{apartment.title}</h3>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 text-sm font-medium">4.9</span>
                        </div>
                      </div>

                      <div className="flex items-center text-secondary mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">Room {apartment.roomNumber}</span>
                      </div>

                      <p className="text-secondary text-sm mb-4 line-clamp-3">
                        {apartment.description}
                      </p>

                      <div className="flex items-center space-x-4 mb-4 text-sm text-secondary">
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 mr-1" />
                          <span>{apartment.bedrooms} bed</span>
                        </div>
                        <div className="flex items-center">
                          <Bath className="h-4 w-4 mr-1" />
                          <span>{apartment.bathrooms || 1} bath</span>
                        </div>
                        <div className="flex items-center">
                          <Square className="h-4 w-4 mr-1" />
                          <span>{apartment.squareFeet || 650} sq ft</span>
                        </div>
                      </div>

                      {apartment.amenities && apartment.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {apartment.amenities.slice(0, 4).map((amenity, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {apartment.amenities.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{apartment.amenities.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <SimplePricing
                            originalPrice={apartment.price}
                            discountPercentage={apartment.discountPercentage || 0}
                          />
                        </div>
                        <ApartmentBookingButton
                          apartmentId={apartment.id}
                          roomNumber={apartment.roomNumber}
                          className="bg-sitenest-secondary hover:bg-sitenest-hover-button text-sitenest-primary hover:text-sitenest-primary"
                          size="md"
                          onAuthRequired={() => setIsAuthModalOpen(true)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-primary/5 to-transparent"></div>

      {/* Booking Procedure Section */}
      <div className="py-2 bg-gradient-to-br from-sitenest-warm-white to-white">
        <BookingProcedure />
      </div>

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-secondary/5 to-transparent"></div>

      {/* Explore Islamabad Section */}
      <div className="py-2 bg-gradient-to-br from-white to-sitenest-background">
        <WhyChooseUs />
      </div>

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-primary/5 to-transparent"></div>

      {/* What Our Guests Say Section */}
      <div className="py-2 bg-gradient-to-br from-sitenest-background to-sitenest-warm-white">
        <Reviews />
      </div>

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-secondary/5 to-transparent"></div>

      {/* About Us Section */}
      <section className="py-24 bg-gradient-to-br from-sitenest-warm-white to-white relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content Side */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div>
                <motion.h2
                  className="section-heading mb-6 text-primary"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  About SiteNest
                </motion.h2>
                <motion.p
                  className="body-elegant text-xl text-secondary leading-relaxed mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  Nestled in the prestigious Bahria Enclave of Islamabad, SiteNest represents the pinnacle of modern hospitality. We've redefined the concept of "home away from home" by creating spaces that seamlessly blend luxury, comfort, and authentic Pakistani warmth.
                </motion.p>
                <motion.p
                  className="text-lg text-secondary leading-relaxed mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  Our meticulously designed apartments offer more than just accommodation – they provide an immersive experience of Pakistan's capital city. From the moment you step into our elegantly furnished spaces, you'll discover why discerning travelers choose SiteNest for their Islamabad journey.
                </motion.p>
              </div>

              {/* Key Features */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  className="flex items-start space-x-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 bg-sitenest-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-playfair text-lg mb-2 text-primary">Premium Location</h3>
                    <p className="text-secondary text-sm">Strategic position in Bahria Enclave with easy access to Islamabad's key attractions</p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start space-x-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 bg-sitenest-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="text-sitenest-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-playfair text-lg mb-2 text-primary">Luxury Amenities</h3>
                    <p className="text-secondary text-sm">Fully furnished apartments with modern appliances and premium finishes</p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start space-x-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 bg-sitenest-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="text-sitenest-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-playfair text-lg mb-2 text-primary">24/7 Service</h3>
                    <p className="text-secondary text-sm">Round-the-clock support ensuring your comfort and peace of mind</p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start space-x-4"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 bg-sitenest-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-playfair text-lg mb-2 text-primary">Cultural Experience</h3>
                    <p className="text-secondary text-sm">Authentic Pakistani hospitality with modern international standards</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Images Side */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* Main Image */}
              <motion.div
                className="relative rounded-2xl overflow-hidden shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1680801935072-3f8cb58cc002?fm=jpg&q=60&w=800&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Faisal Mosque Islamabad"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <h4 className="font-semibold">Faisal Mosque</h4>
                  <p className="text-sm opacity-90">Iconic Islamabad Landmark</p>
                </div>
              </motion.div>

              {/* Secondary Images */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="relative rounded-xl overflow-hidden shadow-lg">
                  <img
                    src="https://cdn.pixabay.com/photo/2018/08/19/10/16/nature-3616194_1280.jpg"
                    alt="Margalla Hills Islamabad"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 text-white text-xs">
                    <p className="font-medium">Margalla Hills</p>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1603998594199-804ec60de289?fm=jpg&q=60&w=400&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Pakistan Monument Islamabad"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-2 left-2 text-white text-xs">
                    <p className="font-medium">Pakistan Monument</p>
                  </div>
                </div>
              </div>

              {/* Floating Card */}
              <motion.div
                className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-6 max-w-xs"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-sitenest-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">S</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">SiteNest Promise</h5>
                    <p className="text-xs text-secondary">Excellence Guaranteed</p>
                  </div>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  "Every guest experiences the perfect blend of Pakistani hospitality and international luxury standards."
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Subtle Section Separator */}
      <div className="h-2 bg-gradient-to-r from-transparent via-sitenest-primary/5 to-transparent"></div>

      {/* FAQ Section */}
      <div className="py-2 bg-gradient-to-br from-white to-sitenest-warm-white">
        <FAQ />
      </div>

  <Footer />

      {/* Room Details Modal */}
      {selectedRoom && (
        <Dialog open={!!selectedRoom} onOpenChange={closeRoomDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary">
                {selectedRoom.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Image Gallery */}
              <div className="relative">
                {(() => {
                  // Create unique image array, avoiding duplication of main image
                  const allImages = selectedRoom.images && selectedRoom.images.length > 0
                    ? selectedRoom.images.filter(Boolean)
                    : [selectedRoom.imageUrl].filter(Boolean);

                  return (
                    <div className="relative h-96 rounded-lg overflow-hidden">
                      <img
                        src={allImages[selectedRoomImageIndex] || selectedRoom.imageUrl}
                        alt={selectedRoom.title}
                        className="w-full h-full object-contain"
                      />

                      {allImages.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoomImageIndex(
                              (selectedRoomImageIndex - 1 + allImages.length) % allImages.length
                            )}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoomImageIndex(
                              (selectedRoomImageIndex + 1) % allImages.length
                            )}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>

                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            {allImages.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setSelectedRoomImageIndex(index)}
                                className={`w-3 h-3 rounded-full ${
                                  index === selectedRoomImageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Room Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Room Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-brand-coral" />
                      <span>Room {selectedRoom.roomNumber}</span>
                    </div>
                    <div className="flex items-center">
                      <Bed className="h-5 w-5 mr-2 text-brand-coral" />
                      <span>{selectedRoom.bedrooms} Bedroom{selectedRoom.bedrooms > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="h-5 w-5 mr-2 text-brand-coral" />
                      <span>{selectedRoom.bathrooms || 1} Bathroom{(selectedRoom.bathrooms || 1) > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="h-5 w-5 mr-2 text-brand-coral" />
                      <span>{selectedRoom.squareFeet || 650} sq ft</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Pricing</h3>
                  <div className="mb-4">
                    <ComprehensivePricing
                      originalPrice={selectedRoom.price}
                      discountPercentage={selectedRoom.discountPercentage || 0}
                      size="lg"
                    />
                  </div>
                  <ApartmentBookingButton
                    apartmentId={selectedRoom.id}
                    roomNumber={selectedRoom.roomNumber}
                    className="w-full bg-brand-coral hover:bg-red-600 text-white"
                    size="lg"
                    onAuthRequired={() => setIsAuthModalOpen(true)}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-primary">Description</h3>
                <p className="text-secondary leading-relaxed">{selectedRoom.description}</p>
              </div>

              {/* Amenities */}
              {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.amenities.map((amenity, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Reviews</h3>
                  <Button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    variant="outline"
                    size="sm"
                    className="text-brand-coral border-brand-coral hover:bg-brand-coral hover:text-white"
                  >
                    {showReviewForm ? "Cancel" : "Add Review"}
                  </Button>
                </div>

                {showReviewForm ? (
                  <ReviewForm
                    apartmentId={selectedRoom.id}
                    onSuccess={() => setShowReviewForm(false)}
                    onCancel={() => setShowReviewForm(false)}
                  />
                ) : (
                  <ReviewCarousel apartmentId={selectedRoom.id} />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Chatbot />
      <BookingModal />

      {/* Authentication Modal */}
      <EnhancedAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(isNewUser) => handleAuthSuccess(isNewUser)}
      />

      {/* Two-Step Verification Modal */}
      <TwoStepVerification
        isOpen={showVerificationModal}
        onComplete={handleVerificationComplete}
        onSkip={() => setShowVerificationModal(false)}
      />


    </div>
  );
}