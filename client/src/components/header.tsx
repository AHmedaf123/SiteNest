import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useSimpleAuth();

  const isActive = (path: string) => location === path;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const openBookingModal = () => {
    const event = new CustomEvent('openBookingModal');
    window.dispatchEvent(event);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Home className="text-brand-coral text-2xl" />
            <span className="text-2xl font-bold text-primary">Side Nest</span>
          </Link>
          
          <div className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className={`transition-colors ${isActive('/') ? 'text-brand-coral' : 'text-primary hover:text-brand-coral'}`}
            >
              Home
            </Link>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-primary hover:text-brand-coral transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('listings')}
              className="text-primary hover:text-brand-coral transition-colors"
            >
              Apartments
            </button>
            <Link 
              href="/calendar" 
              className={`transition-colors ${isActive('/calendar') ? 'text-brand-coral' : 'text-primary hover:text-brand-coral'}`}
            >
              Calendar
            </Link>
            <Link 
              href="/admin" 
              className={`transition-colors ${isActive('/admin') ? 'text-brand-coral' : 'text-primary hover:text-brand-coral'}`}
            >
              Manage Listings
            </Link>
            <button 
              onClick={() => scrollToSection('contact')}
              className="text-primary hover:text-brand-coral transition-colors"
            >
              Contact
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-brand-coral flex items-center justify-center">
                    {user.profileImageUrl ? (
                      <img 
                        src={user.profileImageUrl} 
                        alt={user.firstName || 'User'} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="text-white text-sm" />
                    )}
                  </div>
                  <span className="text-sm text-primary">
                    {user.firstName || user.email || 'User'}
                  </span>
                </div>
                <Button 
                  onClick={openBookingModal}
                  className="bg-brand-coral text-white hover:bg-red-600 transition-colors"
                >
                  Book Now
                </Button>
                <Button 
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => window.location.reload()}
                className="bg-brand-coral text-white hover:bg-red-600 transition-colors"
              >
                Sign In
              </Button>
            )}
            <button 
              className="md:hidden text-primary"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="text-xl" /> : <Menu className="text-xl" />}
            </button>
          </div>
        </nav>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t">
            <div className="flex flex-col space-y-4 pt-4">
              <Link 
                href="/" 
                className="text-primary hover:text-brand-coral transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <button 
                onClick={() => scrollToSection('about')}
                className="text-left text-primary hover:text-brand-coral transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('listings')}
                className="text-left text-primary hover:text-brand-coral transition-colors"
              >
                Apartments
              </button>
              <Link 
                href="/calendar" 
                className="text-primary hover:text-brand-coral transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Calendar
              </Link>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-left text-primary hover:text-brand-coral transition-colors"
              >
                Contact
              </button>
              {isAuthenticated && user && (
                <Button 
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 mt-4"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
