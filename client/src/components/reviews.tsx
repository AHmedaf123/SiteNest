import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Review } from "@shared/schema";

export default function Reviews() {
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

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

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">What Our Guests Say</h2>
          <p className="text-xl text-secondary">Real experiences from our valued customers</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-white shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <img 
                    src={review.imageUrl} 
                    alt={review.customerName}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">{review.customerName}</h4>
                    <div className="flex text-yellow-400">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-secondary italic">"{review.content}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
