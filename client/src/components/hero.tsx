import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Building, Star, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/header";

export default function Hero() {
  const [, setLocation] = useLocation();

  const navigateToApartments = () => {
    setLocation('/apartments');
  };

  const openChatbot = () => {
    const event = new CustomEvent('openChatbot');
    window.dispatchEvent(event);
  };

  return (
    <section id="home" className="relative overflow-hidden">
      {/* Clean Hero Background */}
      <div className="h-screen hero-background relative">
        {/* Header overlaid on hero */}
        <Header />

        {/* Main Content */}
        <div className="relative z-30 container mx-auto px-4 h-full flex items-center">
          <motion.div
            className="max-w-4xl text-white"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.h1
              className="text-4xl md:text-6xl font-bold mb-4 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              Welcome to SiteNest
            </motion.h1>

            <motion.h2
              className="text-xl md:text-2xl text-sitenest-secondary mb-4 leading-relaxed font-light font-playfair"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Where Luxury Isn't Just Lived — It's Experienced.
            </motion.h2>

            <motion.p
              className="text-base md:text-lg text-gray-200 mb-8 leading-relaxed font-light max-w-xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7 }}
            >
              Timeless elegance and five-star serenity in the heart of Islamabad.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.9 }}
            >
              <Button
                onClick={openChatbot}
                className="bg-sitenest-secondary hover:bg-sitenest-hover-button text-sitenest-primary font-semibold px-6 py-3 rounded-lg transition-all duration-300"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Your Signature Stay
              </Button>
              <Button
                onClick={navigateToApartments}
                variant="outline"
                className="border-2 border-sitenest-secondary text-sitenest-secondary hover:bg-sitenest-secondary hover:text-white transition-all duration-300 font-semibold px-6 py-3 rounded-lg"
              >
                <Building className="w-4 h-4 mr-2" />
                Explore Premium Suites
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.2 }}
            >
              <div className="flex items-center">
                <Building className="w-6 h-6 mr-2 text-sitenest-secondary" />
                <div>
                  <div className="text-lg font-bold text-white">150+</div>
                  <div className="text-xs text-gray-300">Curated Luxury Suites</div>
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-6 h-6 mr-2 text-sitenest-secondary fill-current" />
                <div>
                  <div className="text-sm font-semibold text-white">Tailored Comfort</div>
                  <div className="text-xs text-gray-300">24/7 Concierge</div>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-sitenest-secondary" />
                <div>
                  <div className="text-sm font-semibold text-white">Elevated Living</div>
                  <div className="text-xs text-gray-300">in Every Moment</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50 z-10"></div>
      </div>
    </section>
  );
}


