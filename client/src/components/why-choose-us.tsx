import { MapPin, Camera, Utensils, ShoppingBag, Landmark, TreePine } from "lucide-react";
import { motion } from "framer-motion";

export default function WhyChooseUs() {
  const attractions = [
    {
      icon: Landmark,
      title: "Faisal Mosque",
      description: "Iconic modern mosque architecture",
      distance: "8.5 km",
      color: "bg-sitenest-primary",
      textColor: "text-sitenest-primary"
    },
    {
      icon: Camera,
      title: "Pakistan Monument",
      description: "National symbol & museum",
      distance: "12.2 km",
      color: "bg-sitenest-secondary",
      textColor: "text-sitenest-primary"
    },
    {
      icon: ShoppingBag,
      title: "Centaurus Mall",
      description: "Premium shopping destination",
      distance: "6.8 km",
      color: "bg-sitenest-secondary",
      textColor: "text-sitenest-primary"
    },
    {
      icon: Utensils,
      title: "F-7 Markaz",
      description: "Dining & entertainment hub",
      distance: "5.0 km",
      color: "bg-sitenest-primary",
      textColor: "text-sitenest-primary"
    },
    {
      icon: TreePine,
      title: "Margalla Hills",
      description: "Natural hiking trails",
      distance: "15.1 km",
      color: "bg-green-500",
      textColor: "text-green-600"
    },
    {
      icon: MapPin,
      title: "Lok Virsa Museum",
      description: "Cultural heritage center",
      distance: "10.5 km",
      color: "bg-sitenest-primary",
      textColor: "text-sitenest-primary"
    }
  ];

  return (
    <section className="py-20 bg-sitenest-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-6 text-primary">Explore Islamabad</h2>
          <p className="body-elegant text-xl text-secondary max-w-2xl mx-auto">Discover the beauty, culture, and modern attractions of Pakistan's capital city, all within easy reach of SiteNest</p>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-3 gap-8">
          {attractions.map((attraction, index) => (
            <motion.div
              key={index}
              className="glass-card p-6 rounded-xl text-center hover:shadow-xl transition-all duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className={`w-16 h-16 ${attraction.color} rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-subtle`}
                   style={{ animationDelay: `${index * 0.2}s` }}>
                <attraction.icon className="text-white text-2xl" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 font-playfair ${attraction.textColor}`}>{attraction.title}</h3>
              <p className="text-secondary mb-3">{attraction.description}</p>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{attraction.distance} away</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Interactive Map Teaser */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="bg-sitenest-warm-white rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold font-playfair mb-4 text-primary">Perfect Location</h3>
            <p className="text-secondary mb-6">SiteNest is strategically located in Bahria Enclave, Islamabad, providing easy access to the city's most iconic landmarks, shopping districts, and cultural attractions.</p>
            <div className="flex justify-center space-x-6 text-sm text-sitenest-text">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-sitenest-primary rounded-full mr-2"></div>
                <span>Historical Sites</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-sitenest-secondary rounded-full mr-2"></div>
                <span>Shopping Areas</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Dining & Culture</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
