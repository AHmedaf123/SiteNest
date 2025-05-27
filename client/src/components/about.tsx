import { Bed, Home, Building, Award, Shield, Clock, Users, MapPin, Star } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-20 bg-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">About Side Nest</h2>
          <p className="text-xl text-secondary max-w-4xl mx-auto mb-8">
            Founded in 2018, Side Nest has revolutionized the apartment rental experience by combining luxury accommodations 
            with exceptional service. We believe that every guest deserves a home away from home, complete with modern amenities, 
            prime locations, and unparalleled comfort.
          </p>
          <div className="grid md:grid-cols-4 gap-6 text-center mb-12">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-brand-coral rounded-full flex items-center justify-center mb-3">
                <Award className="text-white" />
              </div>
              <h4 className="font-semibold text-lg">Premium Quality</h4>
              <p className="text-sm text-secondary">Handpicked properties meeting our highest standards</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-brand-teal rounded-full flex items-center justify-center mb-3">
                <Shield className="text-white" />
              </div>
              <h4 className="font-semibold text-lg">Secure & Safe</h4>
              <p className="text-sm text-secondary">Advanced security systems and verified hosts</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                <Clock className="text-white" />
              </div>
              <h4 className="font-semibold text-lg">24/7 Support</h4>
              <p className="text-sm text-secondary">Round-the-clock assistance for peace of mind</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-3">
                <Users className="text-white" />
              </div>
              <h4 className="font-semibold text-lg">Personalized Service</h4>
              <p className="text-sm text-secondary">Tailored experiences for every guest</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">Our Property Types</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-brand-coral rounded-full flex items-center justify-center mb-6 mx-auto">
                <Bed className="text-white text-2xl" />
              </div>
              <h4 className="text-2xl font-semibold mb-4 text-center">One-Bed Apartments</h4>
              <p className="text-secondary text-center mb-4">
                Perfect for solo travelers or couples seeking a cozy, intimate space with all modern amenities.
              </p>
              <ul className="text-sm text-secondary space-y-2">
                <li>• 450-650 sq ft living space</li>
                <li>• Fully equipped kitchen</li>
                <li>• High-speed WiFi included</li>
                <li>• Smart TV and entertainment system</li>
                <li>• In-unit laundry facilities</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-brand-teal rounded-full flex items-center justify-center mb-6 mx-auto">
                <Home className="text-white text-2xl" />
              </div>
              <h4 className="text-2xl font-semibold mb-4 text-center">Two-Bed Apartments</h4>
              <p className="text-secondary text-center mb-4">
                Ideal for small families or friends, offering comfortable living with separate bedrooms and shared spaces.
              </p>
              <ul className="text-sm text-secondary space-y-2">
                <li>• 800-1200 sq ft living space</li>
                <li>• Separate living and dining areas</li>
                <li>• Two full bathrooms</li>
                <li>• Private balcony or patio</li>
                <li>• Dedicated workspace</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Building className="text-white text-2xl" />
              </div>
              <h4 className="text-2xl font-semibold mb-4 text-center">Three-Bed Apartments</h4>
              <p className="text-secondary text-center mb-4">
                Spacious accommodations for larger groups or families, featuring multiple bedrooms and generous living areas.
              </p>
              <ul className="text-sm text-secondary space-y-2">
                <li>• 1200-1800 sq ft living space</li>
                <li>• Master suite with walk-in closet</li>
                <li>• Multiple bathrooms</li>
                <li>• Large kitchen with island</li>
                <li>• Private parking included</li>
              </ul>
            </div>
          </div>
        </div>


      </div>
    </section>
  );
}
