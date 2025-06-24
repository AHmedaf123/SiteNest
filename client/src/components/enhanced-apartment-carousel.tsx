import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star, MapPin, Bed, Bath, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ApartmentBookingButton from "@/components/apartment-booking-button";
import type { Apartment } from "@shared/schema";

export default function EnhancedApartmentCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: number]: number}>({});

  const { data: apartments = [], isLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
  });

  const itemsPerView = 3;
  const totalSlides = Math.max(0, apartments.length - itemsPerView + 1);

  // Auto-scroll functionality
  useEffect(() => {
    if (apartments.length > itemsPerView) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [apartments.length, totalSlides, itemsPerView]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

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



  if (isLoading) {
    return (
      <section className="py-20 bg-light">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (apartments.length === 0) {
    return (
      <section className="py-20 bg-light">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">No apartments available</h2>
          <p className="text-xl text-secondary">Check back soon for new listings!</p>
        </div>
      </section>
    );
  }

  const visibleApartments = apartments.slice(currentIndex, currentIndex + itemsPerView);

  return (
    <section className="py-20 bg-light overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 animate-fade-in">Featured Apartments</h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto animate-slide-up">
            Discover our premium selection of luxury apartments with state-of-the-art amenities
          </p>
        </div>

        <div className="relative">
          {apartments.length > itemsPerView && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          <div className="grid md:grid-cols-3 gap-8 transition-all duration-500 ease-in-out">
            {visibleApartments.map((apartment, index) => {
              const allImages = [
                apartment.imageUrl,
                ...(apartment.images || [])
              ].filter(Boolean);

              const currentImg = currentImageIndex[apartment.id] || 0;

              return (
                <Card
                  key={apartment.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-slide-up"
                  style={{ animationDelay: `${index * 150}ms` }}
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

                    <Badge className="absolute top-2 left-2 bg-brand-coral text-white">
                      Featured
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

                    <p className="text-secondary text-sm mb-4 line-clamp-2">
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
                        {apartment.amenities.slice(0, 3).map((amenity, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                        {apartment.amenities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{apartment.amenities.length - 3} more
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

          {apartments.length > itemsPerView && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-brand-coral' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}