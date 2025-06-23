import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Play, Star, MapPin, Bed, Bath, Square, Filter, Search, Building, Award, Users, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/header";
import BookingModal from "@/components/booking-modal";
import Chatbot from "@/components/chatbot";
import ApartmentBookingButton from "@/components/apartment-booking-button";
import type { Apartment } from "@shared/schema";

export default function Apartments() {
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: number]: number}>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [bedroomFilter, setBedroomFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price-low");

  const { data: apartments = [], isLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
  });

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
    const event = new CustomEvent('openBookingModal', {
      detail: { roomId: roomNumber, apartmentId: apartmentId }
    });
    window.dispatchEvent(event);
  };

  const navigateToDetail = (apartmentId: number) => {
    setLocation(`/apartment/${apartmentId}`);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sitenest-primary via-blue-800 to-sitenest-primary">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="text-center">
            {/* Main Title with Animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-6"
            >
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                Our <span className="text-sitenest-secondary">Luxury</span> Apartments
              </h1>
              <div className="w-12 h-0.5 bg-sitenest-secondary mx-auto rounded-full"></div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-sm md:text-base text-white/90 mb-6 max-w-xl mx-auto leading-relaxed font-light"
            >
              Discover exceptional living spaces where luxury meets comfort, featuring premium amenities and breathtaking views in the heart of Islamabad
            </motion.p>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-4"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <Building className="w-5 h-5 text-sitenest-secondary mx-auto mb-1" />
                <div className="text-lg font-bold text-white mb-0.5">{apartments.length}</div>
                <div className="text-white/80 text-xs font-medium">Properties</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <Users className="w-5 h-5 text-sitenest-secondary mx-auto mb-1" />
                <div className="text-lg font-bold text-white mb-0.5">500+</div>
                <div className="text-white/80 text-xs font-medium">Guests</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 hover:bg-white/15 transition-all duration-300">
                <Heart className="w-5 h-5 text-sitenest-secondary mx-auto mb-1" />
                <div className="text-lg font-bold text-white mb-0.5">24/7</div>
                <div className="text-white/80 text-xs font-medium">Service</div>
              </div>
            </motion.div>

            {/* Feature Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-1.5"
            >
              <Badge className="bg-sitenest-secondary/20 text-sitenest-secondary border border-sitenest-secondary/30 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                ✨ Premium
              </Badge>
              <Badge className="bg-white/20 text-white border border-white/30 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                🏢 Modern
              </Badge>
              <Badge className="bg-white/20 text-white border border-white/30 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                🌟 Views
              </Badge>
              <Badge className="bg-white/20 text-white border border-white/30 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                🔒 Secure
              </Badge>
            </motion.div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-sitenest-secondary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-sitenest-secondary/30 rounded-full blur-lg"></div>
      </section>

      {/* Enhanced Filters Section */}
      <section className="py-8 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
          >
            <div className="flex flex-wrap gap-6 items-center justify-between">
              {/* Search Section */}
              <div className="flex items-center space-x-3 min-w-0 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search by name, room number, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 border-gray-200 focus:border-sitenest-secondary focus:ring-sitenest-secondary/20 rounded-xl"
                  />
                </div>
              </div>

              {/* Filters Section */}
              <div className="flex items-center space-x-4 flex-wrap">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-sitenest-primary" />
                  <span className="text-sm font-semibold text-sitenest-primary">Refine Search:</span>
                </div>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-44 border-gray-200 focus:border-sitenest-secondary focus:ring-sitenest-secondary/20 rounded-xl">
                    <SelectValue placeholder="💰 Price Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under-15000">Under PKR 15,000</SelectItem>
                    <SelectItem value="15000-25000">PKR 15,000 - 25,000</SelectItem>
                    <SelectItem value="over-25000">Over PKR 25,000</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
                  <SelectTrigger className="w-36 border-gray-200 focus:border-sitenest-secondary focus:ring-sitenest-secondary/20 rounded-xl">
                    <SelectValue placeholder="🛏️ Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bedrooms</SelectItem>
                    <SelectItem value="1">1 Bedroom</SelectItem>
                    <SelectItem value="2">2 Bedrooms</SelectItem>
                    <SelectItem value="3">3 Bedrooms</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 border-gray-200 focus:border-sitenest-secondary focus:ring-sitenest-secondary/20 rounded-xl">
                    <SelectValue placeholder="📊 Sort By" />
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

            {/* Results Summary */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Showing <span className="font-semibold text-sitenest-primary">{filteredAndSortedApartments.length}</span> of <span className="font-semibold">{apartments.length}</span> luxury apartments
                </span>
                {(searchTerm || priceFilter !== "all" || bedroomFilter !== "all" || sortBy !== "price-low") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setPriceFilter("all");
                      setBedroomFilter("all");
                      setSortBy("price-low");
                    }}
                    className="text-sitenest-secondary hover:text-sitenest-primary transition-colors font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Apartments Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {filteredAndSortedApartments.length === 0 ? (
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
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => navigateToDetail(apartment.id)}
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

                      <Badge className="absolute top-2 left-2 bg-brand-coral text-white">
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
                          {apartment.discountPercentage && apartment.discountPercentage > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xl font-bold text-brand-coral">
                                  PKR {Math.round(apartment.price * (1 - apartment.discountPercentage / 100)).toLocaleString()}
                                </span>
                                <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
                                  -{apartment.discountPercentage}%
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm text-gray-400 line-through">
                                  PKR {apartment.price.toLocaleString()}
                                </span>
                                <span className="text-secondary text-sm">/night</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-xl font-bold text-brand-coral">
                                PKR {apartment.price.toLocaleString()}
                              </span>
                              <span className="text-secondary text-sm ml-1">/night</span>
                            </div>
                          )}
                        </div>
                        <ApartmentBookingButton
                          apartmentId={apartment.id}
                          roomNumber={apartment.roomNumber}
                          className="bg-brand-coral hover:bg-red-600 text-white"
                          size="md"
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

      {/* Modals */}
      <BookingModal />
      <Chatbot />
    </div>
  );
}