import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { getSocket, onEvent, emitEvent } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { ChevronLeft, ChevronRight, Star, MapPin, Bed, Bath, Square, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import BookingModal from "@/components/booking-modal";
import Chatbot from "@/components/chatbot";
import EnhancedAuthModal from "@/components/enhanced-auth-modal";
import ApartmentBookingButton from "@/components/apartment-booking-button";
import { useRealAuth } from "@/hooks/useRealAuth";
import type { Apartment, Review } from "@shared/schema";

export default function ApartmentDetail() {
  const [, params] = useRoute("/apartment/:id");
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    customerName: "",
    rating: 5,
    content: ""
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { isAuthenticated } = useRealAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const apartmentId = params?.id ? parseInt(params.id) : null;

  const { data: apartment, isLoading } = useQuery<Apartment>({
    queryKey: [`/api/apartments/${apartmentId}`],
    enabled: !!apartmentId,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [`/api/reviews?apartmentId=${apartmentId}`],
    enabled: !!apartmentId,
  });

  // Socket.IO connection for real-time reviews
  useEffect(() => {
    if (!apartmentId) return;

    const socket = getSocket();
    setSocket(socket);

    // Join the apartment room for real-time updates
    emitEvent('join-apartment', apartmentId);

    // Listen for new reviews
    const unsubscribeNewReview = onEvent('new-review', (review: Review) => {
      queryClient.setQueryData([`/api/reviews?apartmentId=${apartmentId}`], (oldReviews: Review[] = []) => {
        return [...oldReviews, review];
      });

      toast({
        title: "New Review!",
        description: `${review.customerName} just left a review.`,
      });
    });

    return () => {
      unsubscribeNewReview();
    };
  }, [apartmentId, queryClient, toast]);

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reviewData,
          apartmentId: apartmentId
        }),
      });
      if (!response.ok) throw new Error("Failed to create review");
      return response.json();
    },
    onSuccess: (newReview) => {
      // Optimistically update the cache
      queryClient.setQueryData([`/api/reviews?apartmentId=${apartmentId}`], (oldReviews: Review[] = []) => {
        return [...oldReviews, newReview];
      });

      setIsReviewModalOpen(false);
      setNewReview({ customerName: "", rating: 5, content: "" });
      toast({
        title: "Success!",
        description: "Review added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add review.",
        variant: "destructive",
      });
    },
  });

  if (!apartmentId) {
    return <div>Invalid apartment ID</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading apartment details...</div>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Apartment not found</div>
        </div>
      </div>
    );
  }

  // Create unique image array, avoiding duplication of main image
  const allImages = apartment.images && apartment.images.length > 0
    ? apartment.images.filter(Boolean)
    : [apartment.imageUrl].filter(Boolean);
  const discountedPrice = apartment.discountPercentage
    ? apartment.price * (1 - apartment.discountPercentage / 100)
    : apartment.price;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  const openBookingModal = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      toast({
        title: "Authentication Required",
        description: "Please sign in to book this room.",
        variant: "default"
      });
      return;
    }
    const event = new CustomEvent('openBookingModal', {
      detail: { roomId: apartment.roomNumber, apartmentId: apartment.id }
    });
    window.dispatchEvent(event);
  };

  const handleAuthSuccess = (isNewUser = false) => {
    setIsAuthModalOpen(false);
    toast({
      title: isNewUser ? "Account Created!" : "Welcome Back!",
      description: "You can now proceed with booking.",
    });
  };

  const submitReview = () => {
    if (!newReview.customerName.trim() || !newReview.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createReviewMutation.mutate(newReview);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/apartments")}
            className="mb-4"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Apartments
          </Button>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 pb-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative">
                <div
                  className="relative h-96 rounded-lg overflow-hidden cursor-zoom-in"
                  onMouseMove={handleMouseMove}
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                >
                  <img
                    src={allImages[currentImageIndex]}
                    alt={apartment.title}
                    className={`w-full h-full object-contain transition-transform duration-300 ${
                      isZoomed ? 'scale-150' : 'scale-100'
                    }`}
                    style={isZoomed ? {
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                    } : {}}
                  />

                  {allImages.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white hover:bg-black/50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.slice(0, 8).map((image, index) => (
                    <div
                      key={index}
                      className={`relative h-20 rounded cursor-pointer overflow-hidden border-2 ${
                        currentImageIndex === index ? 'border-brand-coral' : 'border-transparent'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={image}
                        alt={`${apartment.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Apartment Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold">{apartment.title}</h1>
                  <Button variant="ghost" size="sm">
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-gray-600 mb-4">{apartment.description}</p>

                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1" />
                    {apartment.bedrooms} bed
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-1" />
                    {apartment.bathrooms} bath
                  </div>
                  <div className="flex items-center">
                    <Square className="h-4 w-4 mr-1" />
                    {apartment.squareFeet} sq ft
                  </div>
                </div>

                {apartment.amenities && apartment.amenities.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {apartment.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        {apartment.discountPercentage && apartment.discountPercentage > 0 ? (
                          <>
                            <span className="text-3xl font-bold text-brand-coral">
                              PKR {Math.round(discountedPrice).toLocaleString()}
                            </span>
                            <span className="text-lg text-gray-500 line-through">
                              PKR {apartment.price.toLocaleString()}
                            </span>
                            <Badge className="bg-red-500 text-white">
                              {apartment.discountPercentage}% OFF
                            </Badge>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-brand-coral">
                            PKR {apartment.price.toLocaleString()}
                          </span>
                        )}
                        <span className="text-gray-500">/night</span>
                      </div>
                      <p className="text-sm text-gray-500">Room {apartment.roomNumber}</p>
                    </div>
                  </div>

                  <ApartmentBookingButton
                    apartmentId={apartment.id}
                    roomNumber={apartment.roomNumber}
                    className="w-full bg-brand-coral hover:bg-red-600 text-white"
                    size="lg"
                    onAuthRequired={() => setIsAuthModalOpen(true)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Reviews ({reviews.length})</h2>
              <Button
                onClick={() => setIsReviewModalOpen(true)}
                className="bg-brand-coral hover:bg-red-600"
              >
                Add Review
              </Button>
            </div>

            {reviews.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {review.imageUrl && (
                            <img
                              src={review.imageUrl}
                              alt={review.customerName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <h4 className="font-semibold">{review.customerName}</h4>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.createdAt && (
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">{review.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No reviews yet. Be the first to review this apartment!
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Your Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Your Name</Label>
                <Input
                  id="customerName"
                  value={newReview.customerName}
                  onChange={(e) => setNewReview(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <Label>Rating</Label>
                <div className="flex items-center space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="content">Your Review</Label>
                <Textarea
                  id="content"
                  value={newReview.content}
                  onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your experience..."
                  rows={4}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={submitReview}
                  disabled={createReviewMutation.isPending}
                  className="flex-1 bg-brand-coral hover:bg-red-600"
                >
                  {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <BookingModal />
        <Chatbot />

        {/* Authentication Modal */}
        <EnhancedAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(isNewUser) => handleAuthSuccess(isNewUser)}
        />
      </div>
    </div>
  );
}
