import { Bed, Home, Building } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-20 bg-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">About Side Nest</h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            We specialize in providing premium apartment rentals that make you feel at home. 
            From cozy one-bedroom spaces to spacious three-bedroom apartments, we have the perfect place for your stay.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-brand-coral rounded-full flex items-center justify-center mb-6 mx-auto">
              <Bed className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">One-Bed Apartments</h3>
            <p className="text-secondary text-center">
              Perfect for solo travelers or couples seeking a cozy, intimate space with all modern amenities.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-brand-teal rounded-full flex items-center justify-center mb-6 mx-auto">
              <Home className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">Two-Bed Apartments</h3>
            <p className="text-secondary text-center">
              Ideal for small families or friends, offering comfortable living with separate bedrooms and shared spaces.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Building className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-center">Three-Bed Apartments</h3>
            <p className="text-secondary text-center">
              Spacious accommodations for larger groups or families, featuring multiple bedrooms and generous living areas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
