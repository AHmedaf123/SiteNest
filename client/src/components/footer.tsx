import { Home, Facebook, Twitter, Instagram, Linkedin, MapPin, Phone, Mail, Clock } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="bg-text-primary text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Home className="text-brand-coral text-2xl" />
              <span className="text-2xl font-bold">Side Nest</span>
            </div>
            <p className="text-gray-300 mb-6">
              Premium apartment rentals that make you feel at home. Experience comfort, luxury, and exceptional service.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-brand-coral transition-colors">
                <Facebook className="text-xl" />
              </a>
              <a href="#" className="text-gray-300 hover:text-brand-coral transition-colors">
                <Twitter className="text-xl" />
              </a>
              <a href="#" className="text-gray-300 hover:text-brand-coral transition-colors">
                <Instagram className="text-xl" />
              </a>
              <a href="#" className="text-gray-300 hover:text-brand-coral transition-colors">
                <Linkedin className="text-xl" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><a href="#about" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#listings" className="text-gray-300 hover:text-white transition-colors">Apartments</a></li>
              <li><a href="/calendar" className="text-gray-300 hover:text-white transition-colors">Availability</a></li>
              <li><a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-6">Services</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">One-Bed Apartments</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Two-Bed Apartments</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Three-Bed Apartments</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Long-term Rentals</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Corporate Housing</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-6">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="text-brand-coral" />
                <span className="text-gray-300">123 Main Street, City Center</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="text-brand-coral" />
                <span className="text-gray-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="text-brand-coral" />
                <span className="text-gray-300">hello@sidenest.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="text-brand-coral" />
                <span className="text-gray-300">24/7 Support Available</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-600 mt-12 pt-8 text-center">
          <p className="text-gray-300">
            &copy; 2024 Side Nest. All rights reserved. | Designed with ❤️ for exceptional stays
          </p>
        </div>
      </div>
    </footer>
  );
}
