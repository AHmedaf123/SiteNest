import { Home, Facebook, Twitter, Instagram, Linkedin, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "wouter";
import { FooterLogo } from "@/components/ui/logo";

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openChatbot = () => {
    const event = new CustomEvent('openChatbot');
    window.dispatchEvent(event);
  };

  return (
    <footer id="contact" className="bg-sitenest-primary text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="mb-6">
              <FooterLogo textClassName="text-white" />
            </div>
            <p className="text-white mb-6 opacity-80">
              Your home away from home in Bahria Enclave, Islamabad. Experience premium hospitality with modern comfort and exceptional service.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-70 hover:opacity-100">
                <Facebook className="text-xl" />
              </a>
              <a href="#" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-70 hover:opacity-100">
                <Twitter className="text-xl" />
              </a>
              <a href="#" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-70 hover:opacity-100">
                <Instagram className="text-xl" />
              </a>
              <a href="#" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-70 hover:opacity-100">
                <Linkedin className="text-xl" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/apartments" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100">
                  Apartments
                </Link>
              </li>
              <li>
                <button
                  onClick={openChatbot}
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  Availability
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  Contact
                </button>
              </li>
              <li>
                <Link href="/careers" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100">
                  Careers
                </Link>
              </li>
              <li>
                <a href="#" className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Services</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/apartments"
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  Studio Apartments
                </Link>
              </li>
              <li>
                <Link
                  href="/apartments"
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  One-Bed Apartment
                </Link>
              </li>
              <li>
                <Link
                  href="/apartments"
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  Two-Bed Apartments
                </Link>
              </li>
              <li>
                <button
                  onClick={openChatbot}
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  Long-term Rentals
                </button>
              </li>
              <li>
                <button
                  onClick={openChatbot}
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100 text-left"
                >
                  Corporate Housing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="text-sitenest-secondary" />
                <span className="text-white opacity-80">Bahria Enclave, Islamabad, Pakistan</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="text-sitenest-secondary" />
                <a
                  href="https://wa.me/923115197087"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100"
                >
                  0311-5197087 (WhatsApp)
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="text-sitenest-secondary" />
                <a
                  href="mailto:hello@sitenest.com"
                  className="text-white hover:text-sitenest-secondary transition-colors duration-300 opacity-80 hover:opacity-100"
                >
                  hello@sitenest.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="text-sitenest-secondary" />
                <span className="text-white opacity-80">24/7 Support Available</span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </footer>
  );
}
