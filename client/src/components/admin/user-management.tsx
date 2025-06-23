import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Users, CheckCircle, XCircle, Eye, UserCheck, UserX, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  isVerified: boolean; // Computed field: isEmailVerified && isPhoneVerified
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  cnic?: string;
  address?: string;
  profilePicture?: string;
}

interface AffiliateApplication {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  motivation: string;
  status: string;
  createdAt: string;
  user?: User;
}

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AffiliateApplication | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [isApplicationDetailsOpen, setIsApplicationDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch users
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch affiliate applications
  const { data: applications = [], isLoading: applicationsLoading, refetch: refetchApplications } = useQuery<AffiliateApplication[]>({
    queryKey: ["/api/affiliate/applications"],
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch affiliate applications');
      return response.json();
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("Failed to update user role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsUserDetailsOpen(false);
      setSelectedUser(null);
      toast({
        title: "Success!",
        description: "User role updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // Update application status mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, status, reviewNotes }: { applicationId: number; status: string; reviewNotes?: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/applications/${applicationId}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (!response.ok) throw new Error("Failed to update application");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsApplicationDetailsOpen(false);
      setSelectedApplication(null);
      toast({
        title: "Success!",
        description: "Application status updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    },
  });

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsUserDetailsOpen(true);
  };

  const handleViewApplication = (application: AffiliateApplication) => {
    setSelectedApplication(application);
    setIsApplicationDetailsOpen(true);
  };

  const handleUpdateUserRole = (role: string) => {
    if (selectedUser) {
      updateUserRoleMutation.mutate({ userId: selectedUser.id, role });
    }
  };

  const handleUpdateApplication = (status: string, reviewNotes?: string) => {
    if (selectedApplication) {
      updateApplicationMutation.mutate({ applicationId: selectedApplication.id, status, reviewNotes });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-purple-600 text-white">Super Admin</Badge>;
      case "admin":
        return <Badge className="bg-blue-600 text-white">Admin</Badge>;
      case "affiliate":
        return <Badge className="bg-green-600 text-white">Affiliate</Badge>;
      case "customer":
        return <Badge variant="secondary">Customer</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
          <Shield className="w-8 h-8 text-sitenest-primary" />
          <span>User Management</span>
        </h2>
        <p className="text-gray-600">Manage affiliate applications and user roles</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="applications">
            Affiliate Applications
            {pendingApplications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        {/* Affiliate Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          {applicationsLoading ? (
            <div className="text-center py-8">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No affiliate applications found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((application) => (
                <Card key={application.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{application.fullName}</span>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(application.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewApplication(application)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{application.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{application.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Applied: {formatDate(application.createdAt)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          <strong>Experience:</strong> {application.experience}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {usersLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No users found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{user.firstName} {user.lastName}</span>
                      <div className="flex items-center space-x-2">
                        {getRoleBadge(user.role)}
                        {user.isVerified ? (
                          <Badge className="bg-green-100 text-green-800">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <UserX className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{user.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Joined: {formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      {user.address && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-sm">{user.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}
                </div>
                <div>
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                <div>
                  <strong>Phone:</strong> {selectedUser.phone || 'Not provided'}
                </div>
                <div>
                  <strong>Current Role:</strong> {getRoleBadge(selectedUser.role)}
                </div>
                <div>
                  <strong>Overall Verified:</strong> {selectedUser.isVerified ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Email Verified:</strong> {selectedUser.isEmailVerified ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Phone Verified:</strong> {selectedUser.isPhoneVerified ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Joined:</strong> {formatDate(selectedUser.createdAt)}
                </div>
              </div>
              
              {selectedUser.address && (
                <div>
                  <strong>Address:</strong> {selectedUser.address}
                </div>
              )}

              <div className="space-y-2">
                <strong>Update Role:</strong>
                <Select onValueChange={handleUpdateUserRole} defaultValue={selectedUser.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Application Details Dialog */}
      <Dialog open={isApplicationDetailsOpen} onOpenChange={setIsApplicationDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Affiliate Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Name:</strong> {selectedApplication.fullName}</div>
                <div><strong>Email:</strong> {selectedApplication.email}</div>
                <div><strong>Phone:</strong> {selectedApplication.phone}</div>
                <div><strong>Status:</strong> {getStatusBadge(selectedApplication.status)}</div>
                <div className="col-span-2"><strong>Applied:</strong> {formatDate(selectedApplication.createdAt)}</div>
              </div>

              <div>
                <strong>Experience:</strong>
                <p className="text-sm text-gray-600 mt-1">{selectedApplication.experience}</p>
              </div>

              <div>
                <strong>Motivation:</strong>
                <p className="text-sm text-gray-600 mt-1">{selectedApplication.motivation}</p>
              </div>

              {selectedApplication.status === 'pending' && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleUpdateApplication('approved')}
                    disabled={updateApplicationMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleUpdateApplication('rejected')}
                    disabled={updateApplicationMutation.isPending}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
