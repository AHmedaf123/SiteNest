import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Table, Users, Calendar, MessageSquare, Star, Home, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface DatabaseStats {
  apartments: number;
  users: number;
  bookingRequests: number;
  reviews: number;
  affiliateApplications: number;
}

interface TableData {
  apartments?: any[];
  users?: any[];
  bookingRequests?: any[];
  reviews?: any[];
  affiliateApplications?: any[];
}

export default function DatabaseAdmin() {
  const [selectedTable, setSelectedTable] = useState("apartments");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch database statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DatabaseStats>({
    queryKey: ["/api/admin/database/stats"],
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/admin/database/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch database stats');
      return response.json();
    }
  });

  // Fetch table data based on selected table
  const { data: tableData, isLoading: tableLoading } = useQuery<TableData>({
    queryKey: ["/api/admin/database", selectedTable],
    enabled: !!selectedTable,
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/admin/database/${selectedTable}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Failed to fetch ${selectedTable} data`);
      return response.json();
    }
  });

  // Delete mutations for different data types
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database/stats"] });
      toast({ title: "Success", description: "Review deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete review", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database/stats"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/booking-requests/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete booking');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/database/stats"] });
      toast({ title: "Success", description: "Booking deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete booking", variant: "destructive" });
    }
  });

  const handleDelete = (type: string, id: number | string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    switch (type) {
      case 'review':
        deleteReviewMutation.mutate(id as number);
        break;
      case 'user':
        deleteUserMutation.mutate(id as string);
        break;
      case 'booking':
        deleteBookingMutation.mutate(id as number);
        break;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTableContent = () => {
    if (tableLoading) {
      return <div className="text-center py-8">Loading table data...</div>;
    }

    if (!tableData || !tableData[selectedTable as keyof TableData]) {
      return <div className="text-center py-8">No data found for {selectedTable}</div>;
    }

    const data = tableData[selectedTable as keyof TableData] as any[];

    if (data.length === 0) {
      return <div className="text-center py-8">No records found</div>;
    }

    switch (selectedTable) {
      case "apartments":
        return (
          <div className="space-y-4">
            {data.map((apartment) => (
              <Card key={apartment.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Room {apartment.roomNumber} - {apartment.title}</span>
                    <Badge variant="outline">ID: {apartment.id}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Price:</strong> PKR {apartment.price?.toLocaleString() || 'N/A'}
                      {apartment.discountPercentage > 0 && (
                        <Badge className="ml-2 bg-red-500 text-white text-xs">
                          {apartment.discountPercentage}% OFF
                        </Badge>
                      )}
                    </div>
                    <div><strong>Bedrooms:</strong> {apartment.bedrooms}</div>
                    <div><strong>Bathrooms:</strong> {apartment.bathrooms || 1}</div>
                    <div><strong>Square Feet:</strong> {apartment.squareFeet || 650}</div>
                    <div><strong>Images:</strong> {apartment.images?.length || 0}</div>
                    <div><strong>Created:</strong> {formatDate(apartment.createdAt)}</div>
                  </div>
                  {apartment.description && (
                    <div className="mt-2">
                      <strong>Description:</strong>
                      <p className="text-gray-600 text-sm mt-1">{apartment.description}</p>
                    </div>
                  )}
                  {apartment.amenities && apartment.amenities.length > 0 && (
                    <div className="mt-2">
                      <strong>Amenities:</strong>
                      <p className="text-gray-600 text-sm mt-1">{apartment.amenities.join(", ")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "users":
        return (
          <div className="space-y-4">
            {data.map((user) => (
              <Card key={user.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{user.firstName} {user.lastName}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.role === 'admin' || user.role === 'super_admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                      <Badge variant={user.isEmailVerified ? 'default' : 'destructive'}>
                        {user.isEmailVerified ? 'Email Verified' : 'Email Unverified'}
                      </Badge>
                      <Badge variant={user.isPhoneVerified ? 'default' : 'destructive'}>
                        {user.isPhoneVerified ? 'Phone Verified' : 'Phone Unverified'}
                      </Badge>
                      {user.role !== 'super_admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete('user', user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Phone:</strong> {user.phone || 'Not provided'}</div>
                    <div><strong>CNIC:</strong> {user.cnic || 'Not provided'}</div>
                    <div><strong>Joined:</strong> {formatDate(user.createdAt)}</div>
                    <div><strong>Last Updated:</strong> {formatDate(user.updatedAt)}</div>
                  </div>
                  {user.address && (
                    <div className="mt-2">
                      <strong>Address:</strong>
                      <p className="text-gray-600 text-sm mt-1">{user.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "bookingRequests":
        return (
          <div className="space-y-4">
            {data.map((booking) => (
              <Card key={booking.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Booking #{booking.id} - Room {booking.roomNumber}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'}>
                        {booking.status}
                      </Badge>
                      {booking.paymentReceived && (
                        <Badge className="bg-green-500 text-white">Payment Confirmed</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete('booking', booking.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Guest Name:</strong> {booking.guestName}</div>
                    <div><strong>Guests:</strong> {booking.guests}</div>
                    <div><strong>Total Amount:</strong> PKR {booking.totalAmount?.toLocaleString() || 'N/A'}</div>
                    <div><strong>Check-in:</strong> {formatDate(booking.checkInDate)}</div>
                    <div><strong>Check-out:</strong> {formatDate(booking.checkOutDate)}</div>
                    <div><strong>Created:</strong> {formatDate(booking.createdAt)}</div>
                  </div>
                  {booking.specialRequests && (
                    <div className="mt-2">
                      <strong>Special Requests:</strong>
                      <p className="text-gray-600 text-sm mt-1">{booking.specialRequests}</p>
                    </div>
                  )}
                  {booking.adminNotes && (
                    <div className="mt-2">
                      <strong>Admin Notes:</strong>
                      <p className="text-gray-600 text-sm mt-1">{booking.adminNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "reviews":
        return (
          <div className="space-y-4">
            {data.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Review #{review.id}</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <Badge variant="outline">{review.rating}/5</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete('review', review.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Customer:</strong> {review.customerName || 'Anonymous'}</div>
                    <div><strong>Apartment ID:</strong> {review.apartmentId || 'N/A'}</div>
                    <div><strong>Created:</strong> {formatDate(review.createdAt)}</div>
                  </div>
                  {review.content && (
                    <div className="mt-2">
                      <strong>Review:</strong>
                      <p className="text-gray-600 text-sm mt-1">{review.content}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "affiliateApplications":
        return (
          <div className="space-y-4">
            {data.map((application) => (
              <Card key={application.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{application.fullName}</span>
                    <Badge variant={application.status === 'approved' ? 'default' : application.status === 'pending' ? 'secondary' : 'destructive'}>
                      {application.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div><strong>Email:</strong> {application.email}</div>
                    <div><strong>Phone:</strong> {application.phone}</div>
                    <div><strong>Applied:</strong> {formatDate(application.createdAt)}</div>
                  </div>
                  <div className="mt-2">
                    <strong>Experience:</strong>
                    <p className="text-gray-600 text-sm mt-1">{application.experience}</p>
                  </div>
                  <div className="mt-2">
                    <strong>Motivation:</strong>
                    <p className="text-gray-600 text-sm mt-1">{application.motivation}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return <div className="text-center py-8">Unknown table selected</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Database className="w-8 h-8 text-sitenest-primary" />
          <span>Database Admin</span>
        </h2>
        <p className="text-gray-600">View and manage your SiteNest database</p>
      </div>

      {/* Database Statistics */}
      {statsLoading ? (
        <div className="text-center py-4">Loading statistics...</div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Home className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
              <div className="text-2xl font-bold">{stats.apartments}</div>
              <p className="text-sm text-gray-600">Apartments</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Users className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
              <div className="text-2xl font-bold">{stats.users}</div>
              <p className="text-sm text-gray-600">Users</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Calendar className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
              <div className="text-2xl font-bold">{stats.bookingRequests}</div>
              <p className="text-sm text-gray-600">Bookings</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Star className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
              <div className="text-2xl font-bold">{stats.reviews}</div>
              <p className="text-sm text-gray-600">Reviews</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <MessageSquare className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
              <div className="text-2xl font-bold">{stats.affiliateApplications}</div>
              <p className="text-sm text-gray-600">Applications</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table Selection */}
      <Tabs value={selectedTable} onValueChange={setSelectedTable} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="apartments">Apartments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bookingRequests">Bookings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="affiliateApplications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTable} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold capitalize">{selectedTable.replace(/([A-Z])/g, ' $1').trim()}</h3>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Refresh Data
            </Button>
          </div>
          {renderTableContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
