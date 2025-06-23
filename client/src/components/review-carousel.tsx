import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import UserAvatar from "@/components/ui/user-avatar";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useToast } from "@/hooks/use-toast";
import { getSocket, onEvent, emitEvent } from "@/lib/socket";
import type { Review } from "@shared/schema";

interface ReviewCarouselProps {
  apartmentId: number;
}

export default function ReviewCarousel({ apartmentId }: ReviewCarouselProps) {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const { user, token } = useRealAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: [`/api/reviews?apartmentId=${apartmentId}`],
  });

  // Socket.IO connection for real-time review updates
  useEffect(() => {
    const socket = getSocket();

    // Join apartment-specific room
    emitEvent('join-apartment', apartmentId);

    // Listen for new reviews
    const unsubscribeNewReview = onEvent('new-review', (newReview: Review) => {
      queryClient.setQueryData([`/api/reviews?apartmentId=${apartmentId}`], (oldReviews: Review[] = []) => {
        return [newReview, ...oldReviews];
      });
    });

    // Listen for review deletions
    const unsubscribeDeleteReview = onEvent('review-deleted', ({ reviewId }: { reviewId: number }) => {
      queryClient.setQueryData([`/api/reviews?apartmentId=${apartmentId}`], (oldReviews: Review[] = []) => {
        return oldReviews.filter(review => review.id !== reviewId);
      });

      // Reset current index if needed
      setCurrentReviewIndex(prev => {
        const newLength = reviews.filter((review: any) => review.id !== reviewId).length;
        return prev >= newLength ? Math.max(0, newLength - 1) : prev;
      });
    });

    return () => {
      unsubscribeNewReview();
      unsubscribeDeleteReview();
    };
  }, [apartmentId, queryClient]);

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete review");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Review deleted successfully.",
      });
      setShowDeleteConfirm(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete review.",
        variant: "destructive",
      });
      setShowDeleteConfirm(null);
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const currentReview = reviews[currentReviewIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-primary">Guest Reviews ({reviews.length})</h4>
        {reviews.length > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevReview}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500">
              {currentReviewIndex + 1} / {reviews.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextReview}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <UserAvatar
                imageUrl={currentReview.imageUrl}
                name={currentReview.customerName}
                size="sm"
              />
              <div>
                <h5 className="font-semibold text-sm">{currentReview.customerName}</h5>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < currentReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentReview.createdAt && (
                <span className="text-xs text-gray-500">
                  {new Date(currentReview.createdAt).toLocaleDateString()}
                </span>
              )}
              {/* Show delete button only for review owner */}
              {user && currentReview.userId === user.id && (
                <div className="relative">
                  {showDeleteConfirm === currentReview.id ? (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteReviewMutation.mutate(currentReview.id)}
                        disabled={deleteReviewMutation.isPending}
                        className="h-6 px-2 text-xs"
                      >
                        {deleteReviewMutation.isPending ? "..." : "Delete"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(null)}
                        className="h-6 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(currentReview.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      title="Delete review"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{currentReview.content}</p>
        </CardContent>
      </Card>

      {reviews.length > 1 && (
        <div className="flex justify-center space-x-1">
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentReviewIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentReviewIndex ? 'bg-brand-coral' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
