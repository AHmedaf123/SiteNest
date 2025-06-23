import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { getSocket, onEvent } from "@/lib/socket";
import UserAvatar from "@/components/ui/user-avatar";
import type { Review } from "@shared/schema";

export default function Reviews() {
  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  // Socket.IO connection for real-time review updates
  useEffect(() => {
    const socket = getSocket();

    // Listen for global review updates
    const unsubscribeUpdate = onEvent('global-review-update', (newReview: Review) => {
      queryClient.setQueryData(["/api/reviews"], (oldReviews: Review[] = []) => {
        // Add new review to the beginning (newest first)
        return [newReview, ...oldReviews];
      });
    });

    // Listen for global review deletions
    const unsubscribeDelete = onEvent('global-review-deleted', ({ reviewId }: { reviewId: number }) => {
      queryClient.setQueryData(["/api/reviews"], (oldReviews: Review[] = []) => {
        return oldReviews.filter(review => review.id !== reviewId);
      });
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What Our Guests Say</h2>
            <p className="text-xl text-secondary">Loading reviews...</p>
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return (
      <section className="py-20 bg-sitenest-warm-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-heading mb-6 text-primary">What Our Guests Say</h2>
            <p className="body-elegant text-xl text-secondary max-w-2xl mx-auto">Real experiences from travelers who chose SiteNest for their stay in Islamabad</p>
          </div>
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-semibold text-primary mb-4">Be the First to Review!</h3>
              <p className="text-secondary mb-6">Share your experience with SiteNest and help future guests make their decision.</p>
              <p className="text-sm text-gray-500">Reviews from apartment detail pages will automatically appear here.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-sitenest-warm-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-6 text-primary">What Our Guests Say</h2>
          <p className="body-elegant text-xl text-secondary max-w-2xl mx-auto">Real experiences from travelers who chose SiteNest for their stay in Islamabad</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="glass-card shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <UserAvatar
                      imageUrl={review.imageUrl}
                      name={review.customerName}
                      size="lg"
                      className="mr-4 border-2 border-sitenest-blue"
                    />
                    <div>
                      <h4 className="font-semibold font-playfair text-lg">{review.customerName}</h4>
                      <div className="flex text-sitenest-blue">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-secondary italic leading-relaxed">"{review.content}"</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators - Dynamic based on actual reviews */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-600">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-sitenest-blue mr-2 fill-current" />
              <span className="font-semibold">
                {reviews.length > 0
                  ? `${(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}/5 Average Rating`
                  : "No ratings yet"
                }
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-sitenest-blue mr-2">{reviews.length}</span>
              <span>{reviews.length === 1 ? "Review" : "Reviews"}</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-sitenest-blue mr-2">
                {reviews.length > 0
                  ? `${Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)}%`
                  : "0%"
                }
              </span>
              <span>Guest Satisfaction</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
