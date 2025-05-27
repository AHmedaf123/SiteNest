import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Play, Star, MapPin, Bed, Bath, Square, Filter, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/header";
import type { Apartment } from "@shared/schema";

export default function Apartments() {
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: number]: number}>({});
  const [showVideo, setShowVideo] = useState<{[key: number]: boolean}>({});
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

  const toggleVideo = (apartmentId: number) => {
    setShowVideo(prev => ({
      ...prev,
      [apartmentId]: !prev[apartmentId]
    }));
  };

  const openBookingModal = () => {
    const event = new CustomEvent('openBookingModal');
    window.dispatchEvent(event);
  };

  // Filter and sort apartments
  const filteredAndSortedApartments = apartments
    .filter(apartment => {
      const matchesSearch = apartment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           apartment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           apartment.roomNumber.includes(searchTerm);
      
      const matchesPrice = priceFilter === "all" || 
                          (priceFilter === "under-150" && apartment.price < 150) ||
                          (priceFilter === "150-250" && apartment.price >= 150 && apartment.price <= 250) ||
                          (priceFilter === "over-250" && apartment.price > 250);
      
      const matchesBedrooms = bedroomFilter === "all" || 
                             apartment.bedrooms.toString() === bedroomFilter;
      
      return matchesSearch && matchesPrice && matchesBedrooms;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
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
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-coral to-brand-teal py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4 animate-fade-in">Our Apartments</h1>
          <p className="text-xl mb-8 animate-slide-up">
            Discover luxury living with premium amenities and stunning views
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Badge className="bg-white/20 text-white px-4 py-2">
              {apartments.length} Properties Available
            </Badge>
            <Badge className="bg-white/20 text-white px-4 py-2">
              Premium Locations
            </Badge>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 bg-light border-b">
        <div className="container mx-auto px-4">
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
                  <SelectItem value="under-150">Under $150</SelectItem>
                  <SelectItem value="150-250">$150 - $250</SelectItem>
                  <SelectItem value="over-250">Over $250</SelectItem>
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
                const allImages = [
                  apartment.imageUrl,
                  ...(apartment.images || [])
                ].filter(Boolean);
                
                const currentImg = currentImageIndex[apartment.id] || 0;
                const isVideoShown = showVideo[apartment.id] || false;

                return (
                  <Card 
                    key={apartment.id} 
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative overflow-hidden rounded-t-xl h-64">
                      {!isVideoShown ? (
                        <>
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
                                onClick={() => prevImage(apartment.id, allImages.length)}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => nextImage(apartment.id, allImages.length)}
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
                        </>
                      ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          {apartment.videoUrl ? (
                            <iframe
                              src={apartment.videoUrl}
                              className="w-full h-full"
                              allowFullScreen
                              title={`${apartment.title} Video Tour`}
                            />
                          ) : (
                            <div className="text-white text-center">
                              <Play className="h-12 w-12 mx-auto mb-2" />
                              <p>Video not available</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {apartment.videoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVideo(apartment.id)}
                          className="absolute top-2 right-2 bg-black/30 text-white hover:bg-black/50"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
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
                        <div>
                          <span className="text-2xl font-bold text-brand-coral">
                            ${apartment.price}
                          </span>
                          <span className="text-secondary text-sm">/night</span>
                        </div>
                        <Button 
                          onClick={openBookingModal}
                          className="bg-brand-coral hover:bg-red-600 text-white px-6 py-2"
                        >
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}