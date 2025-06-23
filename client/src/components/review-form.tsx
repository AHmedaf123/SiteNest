import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";

interface ReviewFormProps {
  apartmentId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ apartmentId, onSuccess, onCancel }: ReviewFormProps) {
  const { user, token, isAuthenticated } = useRealAuth();
  const [newReview, setNewReview] = useState({
    customerName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    rating: 5,
    content: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  if (!isAuthenticated || !user || !token) {
    return (
      <div className="space-y-4 p-4 bg-white rounded-lg border">
        <h3 className="text-lg font-semibold text-primary">Authentication Required</h3>
        <p className="text-gray-600">Please sign in to add a review.</p>
      </div>
    );
  }

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...reviewData,
          apartmentId: apartmentId
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create review");
      }
      return response.json();
    },
    onSuccess: (newReview) => {
      // Update the global reviews cache (for home page testimonials) - add to beginning for newest first
      queryClient.setQueryData(["/api/reviews"], (oldReviews: any[] = []) => {
        return [newReview, ...oldReviews];
      });

      // Also update apartment-specific reviews if they exist - add to beginning for newest first
      queryClient.setQueryData([`/api/reviews?apartmentId=${apartmentId}`], (oldReviews: any[] = []) => {
        return [newReview, ...oldReviews];
      });

      // Invalidate queries to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: [`/api/reviews?apartmentId=${apartmentId}`] });

      setNewReview({ customerName: "", rating: 5, content: "" });
      toast({
        title: "Success!",
        description: "Review added successfully and will appear in testimonials.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add review.",
        variant: "destructive",
      });
    },
  });

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
    <div className="space-y-4 p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold text-primary">Add Your Review</h3>

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
          rows={3}
        />
      </div>

      <div className="flex space-x-2 pt-2">
        <Button
          onClick={submitReview}
          disabled={createReviewMutation.isPending}
          className="flex-1 bg-brand-coral hover:bg-red-600"
        >
          {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
        </Button>
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
