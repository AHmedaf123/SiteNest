import { useState, useEffect } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

export function useSimpleAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('sideNestUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const signIn = (userData: User) => {
    setUser(userData);
    localStorage.setItem('sideNestUser', JSON.stringify(userData));
    // Force immediate update to show home page
    window.location.href = '/';
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('sideNestUser');
    // Always redirect to home page after signout
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
  };
}