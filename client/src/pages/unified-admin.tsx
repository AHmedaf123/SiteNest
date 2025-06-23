import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AdminLogo } from "@/components/ui/logo";

// Import existing admin components
import ApartmentManagement from "@/components/admin/apartment-management";
import BookingManagement from "@/components/admin/booking-management";
import UserManagement from "@/components/admin/user-management";
import DatabaseAdmin from "@/components/admin/database-admin";
import AffiliateManagement from "@/components/admin/affiliate-management";

export default function UnifiedAdmin() {
  const [, setLocation] = useLocation();
  const { user } = useRealAuth();
  const { isAdmin } = useRoleAccess();

  // Redirect if not admin
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You need admin privileges to access the admin panel.</p>
            <button 
              onClick={() => setLocation('/')}
              className="bg-sitenest-primary text-white px-4 py-2 rounded hover:bg-sitenest-primary/90"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <AdminLogo />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage all aspects of your SiteNest platform</p>
        </div>

        {/* Unified Admin Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="listings" className="flex items-center space-x-2">
              <span>Manage Listings</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center space-x-2">
              <span>New Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="flex items-center space-x-2">
              <span>Affiliate Management</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center space-x-2">
              <span>Database Admin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            <ApartmentManagement />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <BookingManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="affiliates" className="space-y-6">
            <AffiliateManagement />
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <DatabaseAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
