import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import EnhancedAuthModal from "@/components/enhanced-auth-modal";
import ProfileCompletionModal from "@/components/profile-completion-modal";
import { HeaderLogo } from "@/components/ui/logo";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, isAuthenticated, logout, showProfileCompletion, setShowProfileCompletion } = useRealAuth();
  const { hasPermission, isAdmin, isAffiliate, isSuperAdmin } = useRoleAccess();
  const [userDisplayName, setUserDisplayName] = useState(user?.firstName || user?.email || 'User');

  // Check if we're on the home page to determine header positioning
  const isHomePage = location === '/';

  // Listen for user updates to refresh the display name immediately
  useEffect(() => {
    const handleUserUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail.user;
      setUserDisplayName(updatedUser?.firstName || updatedUser?.email || 'User');
    };

    window.addEventListener('userUpdated', handleUserUpdate as EventListener);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
    };
  }, []);

  // Update display name when user changes
  useEffect(() => {
    setUserDisplayName(user?.firstName || user?.email || 'User');
  }, [user]);

  const isActive = (path: string) => location === path;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const openBookingModal = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      setIsMobileMenuOpen(false);
      return;
    }
    // Trigger general booking modal (room selection enabled)
    const event = new CustomEvent('openBookingModal', {
      detail: { roomId: 'any', apartmentId: 0 }
    });
    window.dispatchEvent(event);
    setIsMobileMenuOpen(false);
  };

  const handleAuthSuccess = (isNewUser = false) => {
    setIsAuthModalOpen(false);
    // Header doesn't need to handle verification flow - that's handled by the home page
  };

  return (
    <header className={isHomePage ? "absolute top-0 left-0 right-0 z-50" : "sticky top-0 z-50 bg-sitenest-primary"}>
      <div className="container mx-auto px-4 py-4">
        <nav className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <HeaderLogo />
          </Link>

          <div className="hidden md:flex space-x-8">
            {/* Home - Always visible */}
            <Link
              href="/"
              className={`transition-colors duration-300 ${isActive('/') ? 'text-sitenest-secondary' : 'text-white hover:text-sitenest-hover-button'}`}
            >
              Home
            </Link>

            {/* Apartments - Always visible */}
            <Link
              href="/apartments"
              className={`transition-colors duration-300 ${isActive('/apartments') ? 'text-sitenest-secondary' : 'text-white hover:text-sitenest-hover-button'}`}
            >
              Apartments
            </Link>

            {/* Calendar - Visible for affiliates, admins, and super admins */}
            {(isAffiliate() || isAdmin()) && (
              <Link
                href="/calendar"
                className={`transition-colors duration-300 ${isActive('/calendar') ? 'text-sitenest-secondary' : 'text-white hover:text-sitenest-hover-button'}`}
              >
                Calendar
              </Link>
            )}

            {/* Affiliate Dashboard - Visible for affiliates, admins, and super admins */}
            {(isAffiliate() || isAdmin()) && (
              <Link
                href="/affiliate-dashboard"
                className={`transition-colors duration-300 ${isActive('/affiliate-dashboard') ? 'text-sitenest-secondary' : 'text-white hover:text-sitenest-hover-button'}`}
              >
                Affiliate
              </Link>
            )}

            {/* Admin Dashboard - Visible for admins and super admins only */}
            {isAdmin() && (
              <Link
                href="/admin"
                className={`transition-colors duration-300 ${isActive('/admin') ? 'text-sitenest-secondary' : 'text-white hover:text-sitenest-hover-button'}`}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                <Link href="/profile" className="hidden md:flex items-center space-x-3 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-sitenest-secondary flex items-center justify-center">
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
                  <span className="text-sm text-white">
                    {userDisplayName}
                  </span>
                </Link>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    openBookingModal();
                  }}
                  className="bg-sitenest-secondary text-white hover:bg-sitenest-hover-button transition-colors duration-300"
                >
                  Book Now
                </Button>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center space-x-2 border-sitenest-secondary text-sitenest-secondary hover:bg-sitenest-secondary hover:text-sitenest-primary"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-sitenest-secondary text-sitenest-primary hover:bg-sitenest-hover-button hover:text-sitenest-primary transition-colors duration-300"
              >
                Sign In
              </Button>
            )}
            <button
              className="md:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="text-xl" /> : <Menu className="text-xl" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/20">
            <div className="flex flex-col space-y-4 pt-4">
              {/* Home - Always visible */}
              <Link
                href="/"
                className="text-white hover:text-sitenest-hover-button transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>

              {/* Apartments - Always visible */}
              <Link
                href="/apartments"
                className="text-white hover:text-sitenest-hover-button transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Apartments
              </Link>

              {/* Calendar - Visible for affiliates, admins, and super admins */}
              {(isAffiliate() || isAdmin()) && (
                <Link
                  href="/calendar"
                  className="text-white hover:text-sitenest-hover-button transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Calendar
                </Link>
              )}

              {/* Affiliate Dashboard - Visible for affiliates, admins, and super admins */}
              {(isAffiliate() || isAdmin()) && (
                <Link
                  href="/affiliate-dashboard"
                  className="text-white hover:text-sitenest-hover-button transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Affiliate
                </Link>
              )}

              {/* Admin Dashboard - Visible for admins and super admins only */}
              {isAdmin() && (
                <Link
                  href="/admin"
                  className="text-white hover:text-sitenest-hover-button transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              {isAuthenticated && user ? (
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 mt-4 border-sitenest-secondary text-sitenest-secondary hover:bg-sitenest-secondary hover:text-sitenest-primary"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="bg-sitenest-secondary text-sitenest-primary hover:bg-sitenest-hover-button hover:text-sitenest-primary transition-colors duration-300 mt-4"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      <EnhancedAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(isNewUser) => handleAuthSuccess(isNewUser)}
      />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileCompletion}
        onClose={() => setShowProfileCompletion(false)}
        onComplete={() => setShowProfileCompletion(false)}
      />
    </header>
  );
}
