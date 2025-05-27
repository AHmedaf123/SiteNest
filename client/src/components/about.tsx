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

        <div className="bg-white rounded-xl p-8 md:p-12 shadow-lg">
          <h3 className="text-3xl font-bold text-center mb-8">Why Choose Side Nest?</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-semibold mb-4 flex items-center">
                <MapPin className="text-brand-coral mr-3" />
                Prime Locations
              </h4>
              <p className="text-secondary mb-6">
                All our properties are strategically located in the heart of major cities, providing easy access to business districts, 
                shopping centers, restaurants, and public transportation. Whether you're traveling for business or leisure, 
                you'll find yourself perfectly positioned to explore and enjoy your destination.
              </p>
              
              <h4 className="text-xl font-semibold mb-4 flex items-center">
                <Star className="text-brand-coral mr-3" />
                Exceptional Standards
              </h4>
              <p className="text-secondary">
                Every property in our portfolio undergoes rigorous quality checks and meets our premium standards. 
                From luxury furnishings to high-end appliances, we ensure that every detail contributes to your comfort and satisfaction.
              </p>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="text-brand-coral mr-3" />
                Dedicated Support Team
              </h4>
              <p className="text-secondary mb-6">
                Our experienced hospitality team is available 24/7 to assist with any questions or concerns. 
                From check-in to check-out, we're here to ensure your stay is seamless and memorable. 
                Our local experts can also provide recommendations for dining, entertainment, and attractions.
              </p>
              
              <h4 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="text-brand-coral mr-3" />
                Trust & Safety
              </h4>
              <p className="text-secondary">
                Your safety and security are our top priorities. All properties feature secure access systems, 
                and our verification process ensures that both guests and hosts meet our community standards. 
                We also provide comprehensive insurance coverage for your peace of mind.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
