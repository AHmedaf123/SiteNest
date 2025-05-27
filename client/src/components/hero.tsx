import { Button } from "@/components/ui/button";

export default function Hero() {
  const scrollToListings = () => {
    const element = document.getElementById('listings');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openChatbot = () => {
    const event = new CustomEvent('openChatbot');
    window.dispatchEvent(event);
  };

  return (
    <section id="home" className="relative">
      <div 
        className="h-screen bg-cover bg-center relative"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl text-white animate-slide-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Welcome to Side Nest</h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Stay with us and feel at home. Experience premium apartment living in the heart of the city.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button 
                onClick={scrollToListings}
                size="lg"
                className="bg-brand-coral text-white hover:bg-red-600 transition-all duration-300 transform hover:scale-105 text-lg font-semibold px-8 py-4"
              >
                Explore Apartments
              </Button>
              <Button 
                onClick={openChatbot}
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-primary transition-all duration-300 text-lg font-semibold px-8 py-4"
              >
                Start Booking
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
