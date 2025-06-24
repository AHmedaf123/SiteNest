import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ApartmentBookingButton from "@/components/apartment-booking-button";
import type { Apartment } from "@shared/schema";

export default function ApartmentCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoScrollInterval, setAutoScrollInterval] = useState<NodeJS.Timeout | null>(null);

  const { data: apartments = [], isLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
  });

  const slidesPerView = 3;
  const totalSlides = Math.ceil(apartments.length / slidesPerView);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const startAutoScroll = () => {
    const interval = setInterval(nextSlide, 3000);
    setAutoScrollInterval(interval);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
  };

  useEffect(() => {
    if (apartments.length > 0) {
      startAutoScroll();
    }
    return () => stopAutoScroll();
  }, [apartments.length]);



  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Featured Apartments</h2>
            <p className="text-xl text-secondary">Loading apartments...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="listings" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Featured Apartments</h2>
          <p className="text-xl text-secondary">Discover our carefully selected premium apartments</p>
        </div>
        
        <div className="relative">
          <div 
            className="overflow-hidden"
            onMouseEnter={stopAutoScroll}
            onMouseLeave={startAutoScroll}
          >
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {apartments.map((apartment) => (
                <div key={apartment.id} className="flex-none w-full md:w-1/3 px-4">
                  <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={apartment.imageUrl} 
                        alt={apartment.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-2">{apartment.title}</h3>
                      <p className="text-secondary mb-4">{apartment.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold brand-coral">${apartment.price}/night</span>
                        <ApartmentBookingButton
                          apartmentId={apartment.id}
                          roomNumber={apartment.roomNumber}
                          className="bg-brand-coral text-white hover:bg-red-600"
                          size="md"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          
          {/* Carousel Controls */}
          <button 
            onClick={() => {
              stopAutoScroll();
              prevSlide();
              startAutoScroll();
            }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="text-primary" />
          </button>
          <button 
            onClick={() => {
              stopAutoScroll();
              nextSlide();
              startAutoScroll();
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="text-primary" />
          </button>
          
          {/* Carousel Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-brand-coral' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
