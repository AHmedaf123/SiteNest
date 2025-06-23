import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import Header from "@/components/header";
import {
  ArrowLeft,
  Link as LinkIcon,
  TrendingUp,
  DollarSign,
  Users,
  Copy,
  Plus,
  Calendar,
  BarChart3,
  Eye,
  MousePointer,
  UserPlus,
  Briefcase,
  Power,
  PowerOff,
  Trash2,
  Wallet,
  CreditCard,
  RefreshCw
} from "lucide-react";

interface AffiliateLink {
  id: number;
  linkCode: string;
  linkUrl: string;
  // NEW COMMISSION-BASED SYSTEM FIELDS
  longStayDiscountEnabled?: boolean;
  longStayMinDays?: number;
  longStayDiscountType?: 'percentage' | 'flat';
  longStayDiscountValue?: number;
  // Legacy fields (for backward compatibility)
  priceAdjustment: number;
  adjustmentType: 'add' | 'subtract' | 'percentage';
  discountPercentage?: number;
  additionalAmount?: number;
  additionalDiscount?: number;
  isActive: boolean;
  clickCount: number;
  conversionCount: number;
  createdAt: string;
}

interface AffiliateMetrics {
  totalClicks: number;
  totalRegistrations: number;
  totalBookings: number;
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  withdrawnEarnings: number;
  conversionRate: string;
}

interface AffiliateEarning {
  id: number;
  affiliateId: string;
  bookingId: number;
  userId: string;
  commissionAmount: number;
  commissionRate: number;
  baseAmount: number;
  status: 'pending' | 'approved' | 'withdrawn';
  withdrawalId?: number;
  withdrawalDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalRequest {
  id: number;
  affiliateId: string;
  amount: number;
  accountNumber: string;
  accountTitle: string;
  bankName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useRealAuth();
  const { isAffiliate, isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    accountNumber: '',
    accountTitle: '',
    bankName: ''
  });
  const [newLink, setNewLink] = useState({
    // NEW COMMISSION-BASED SYSTEM FIELDS
    longStayDiscountEnabled: false,
    longStayMinDays: 5,
    longStayDiscountType: 'percentage' as 'percentage' | 'flat',
    longStayDiscountValue: 0,
    // Legacy fields (for backward compatibility)
    priceAdjustment: 0,
    adjustmentType: 'add' as 'add' | 'subtract' | 'percentage',
    discountPercentage: 0,
    additionalAmount: 0,
    additionalDiscount: 0
  });

  // Check access
  if (!user || (!isAffiliate() && !isAdmin())) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You need affiliate privileges to access this dashboard.</p>
            <Button onClick={() => setLocation('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // Fetch current user profile to get latest commission rate
  const { data: currentUser, refetch: refetchProfile } = useQuery({
    queryKey: ["/api/auth/profile"],
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch("/api/auth/profile", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use current user data if available, fallback to auth context user
  const displayUser = currentUser || user;

  // Fetch affiliate links
  const { data: links = [], refetch: refetchLinks } = useQuery<AffiliateLink[]>({
    queryKey: ["/api/affiliate/links"],
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/links', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch links');
      return response.json();
    }
  });

  // Fetch affiliate metrics
  const { data: metricsData } = useQuery<{ metrics: any[], summary: AffiliateMetrics }>({
    queryKey: ["/api/affiliate/metrics"],
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    }
  });

  // Fetch withdrawal requests
  const { data: withdrawalRequests = [] } = useQuery<WithdrawalRequest[]>({
    queryKey: ["/api/affiliate/withdrawal-requests"],
    queryFn: async () => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/withdrawal-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch withdrawal requests');
      return response.json();
    }
  });

  const metrics = metricsData?.summary || {
    totalClicks: 0,
    totalRegistrations: 0,
    totalBookings: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    approvedEarnings: 0,
    withdrawnEarnings: 0,
    conversionRate: '0.00'
  };

  // Withdrawal request mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (withdrawalData: typeof withdrawalForm) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/withdrawal-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseInt(withdrawalData.amount),
          accountNumber: withdrawalData.accountNumber,
          accountTitle: withdrawalData.accountTitle,
          bankName: withdrawalData.bankName
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit withdrawal request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/withdrawal-requests"] });
      setIsWithdrawing(false);
      setWithdrawalForm({
        amount: '',
        accountNumber: '',
        accountTitle: '',
        bankName: ''
      });
      toast({
        title: "Success!",
        description: "Withdrawal request submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleWithdrawal = () => {
    if (!withdrawalForm.amount || !withdrawalForm.accountNumber || !withdrawalForm.accountTitle || !withdrawalForm.bankName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(withdrawalForm.amount);
    if (amount < 1000) {
      toast({
        title: "Error",
        description: "Minimum withdrawal amount is 1000 PKR",
        variant: "destructive"
      });
      return;
    }

    if (amount > metrics.approvedEarnings) {
      toast({
        title: "Error",
        description: `Insufficient balance. Available: ${metrics.approvedEarnings} PKR`,
        variant: "destructive"
      });
      return;
    }

    withdrawalMutation.mutate(withdrawalForm);
  };

  const handleCreateLink = async () => {
    try {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch('/api/affiliate/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLink)
      });

      if (response.ok) {
        toast({
          title: "Link Created!",
          description: "Your affiliate link has been created successfully.",
        });
        setIsCreatingLink(false);
        setNewLink({
          longStayDiscountEnabled: false,
          longStayMinDays: 5,
          longStayDiscountType: 'percentage',
          longStayDiscountValue: 0,
          priceAdjustment: 0,
          adjustmentType: 'add',
          discountPercentage: 0,
          additionalAmount: 0,
          additionalDiscount: 0
        });
        refetchLinks();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create link",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while creating the link",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const handleToggleLink = async (linkId: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('sitenest_token');
      const endpoint = isActive ? 'activate' : 'deactivate';
      const response = await fetch(`/api/affiliate/links/${linkId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: `Link ${isActive ? 'activated' : 'deactivated'} successfully.`,
        });
        refetchLinks();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update link",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the link",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Link deleted successfully.",
        });
        refetchLinks();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete link",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the link",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (adjustment: number, type: string) => {
    if (type === 'percentage') {
      return `${adjustment > 0 ? '+' : ''}${adjustment}%`;
    }
    return `${adjustment > 0 ? '+' : ''}${adjustment} PKR`;
  };

  const formatLinkDescription = (link: AffiliateLink) => {
    const features = [];

    // New commission-based system
    features.push(`${displayUser?.commissionRate || 10}% Commission`);

    // Long-stay discount
    if (link.longStayDiscountEnabled && link.longStayDiscountValue && link.longStayDiscountValue > 0) {
      const discountText = link.longStayDiscountType === 'percentage'
        ? `${link.longStayDiscountValue}%`
        : `${link.longStayDiscountValue} PKR`;
      features.push(`Long-stay: ${discountText} off (${link.longStayMinDays}+ days)`);
    }

    // Legacy support for old adjustment format
    if (link.additionalAmount && link.additionalAmount > 0) {
      features.push(`+${link.additionalAmount.toLocaleString()} PKR`);
    }

    if (link.additionalDiscount && link.additionalDiscount > 0) {
      features.push(`-${link.additionalDiscount}%`);
    }

    if (features.length === 1 && link.priceAdjustment !== 0) {
      features.push(formatPrice(
        link.adjustmentType === 'percentage' ? link.discountPercentage || 0 : link.priceAdjustment,
        link.adjustmentType
      ));
    }

    return features.join(' • ');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Briefcase className="w-8 h-8 text-sitenest-primary" />
                <span>Affiliate Dashboard</span>
              </h1>
              <p className="text-gray-600">Manage your affiliate links and track your performance</p>
            </div>
          </div>
          <Button
            onClick={() => setLocation('/calendar')}
            className="bg-sitenest-primary hover:bg-sitenest-primary/90"
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Calendar
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Commission Rate Card */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Your Commission Rate</p>
                  <p className="text-3xl font-bold text-green-600">{displayUser?.commissionRate || 10}%</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchProfile()}
                    className="text-xs text-green-600 hover:text-green-700 p-0 h-auto mt-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                  <p className="text-2xl font-bold">{metrics.totalClicks}</p>
                </div>
                <MousePointer className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Registrations</p>
                  <p className="text-2xl font-bold">{metrics.totalRegistrations}</p>
                </div>
                <UserPlus className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bookings</p>
                  <p className="text-2xl font-bold">{metrics.totalBookings}</p>
                </div>
                <Briefcase className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold">{metrics.totalEarnings.toLocaleString()} PKR</p>
                  <p className="text-xs text-gray-500">
                    Pending: {metrics.pendingEarnings.toLocaleString()} PKR
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Commission Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending Commission</p>
                <p className="text-xl font-bold text-orange-600">{metrics.pendingEarnings.toLocaleString()} PKR</p>
                <p className="text-xs text-gray-500">Awaiting approval</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Approved Commission</p>
                <p className="text-xl font-bold text-green-600">{metrics.approvedEarnings.toLocaleString()} PKR</p>
                <p className="text-xs text-gray-500 mb-3">Ready for withdrawal</p>
                {metrics.approvedEarnings >= 1000 && (
                  <Button
                    onClick={() => setIsWithdrawing(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Wallet className="w-4 h-4 mr-1" />
                    Withdraw
                  </Button>
                )}
                {metrics.approvedEarnings > 0 && metrics.approvedEarnings < 1000 && (
                  <p className="text-xs text-red-500">Minimum withdrawal: 1000 PKR</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Withdrawn</p>
                <p className="text-xl font-bold text-blue-600">{metrics.withdrawnEarnings.toLocaleString()} PKR</p>
                <p className="text-xs text-gray-500">Already paid out</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="links" className="space-y-6">
          <TabsList>
            <TabsTrigger value="links">Affiliate Links</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-6">
            {/* Create New Link */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <LinkIcon className="w-5 h-5" />
                    <span>Create New Affiliate Link</span>
                  </CardTitle>
                  <Button
                    onClick={() => setIsCreatingLink(!isCreatingLink)}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Link
                  </Button>
                </div>
              </CardHeader>
              {isCreatingLink && (
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-green-800 mb-2">🎉 New Commission-Based System!</h4>
                      <p className="text-sm text-green-700">
                        You now earn a <strong>{displayUser?.commissionRate || 10}% commission</strong> on every successful booking from your affiliate links.
                        No more price adjustments - just pure commission earnings!
                      </p>
                    </div>

                    {/* Long-Stay Discount Section */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="longStayDiscountEnabled"
                          checked={newLink.longStayDiscountEnabled}
                          onChange={(e) => setNewLink(prev => ({ ...prev, longStayDiscountEnabled: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="longStayDiscountEnabled" className="font-medium text-primary">
                          Enable Long-Stay Discount
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600">
                        Offer special discounts for bookings longer than a certain number of days
                      </p>

                      {newLink.longStayDiscountEnabled && (
                        <div className="space-y-3 mt-4">
                          <div>
                            <Label htmlFor="longStayMinDays">Minimum Days for Discount</Label>
                            <Input
                              id="longStayMinDays"
                              type="number"
                              min="1"
                              max="365"
                              value={newLink.longStayMinDays}
                              onChange={(e) => setNewLink(prev => ({ ...prev, longStayMinDays: parseInt(e.target.value) || 5 }))}
                              placeholder="e.g., 5"
                            />
                          </div>

                          <div>
                            <Label htmlFor="longStayDiscountType">Discount Type</Label>
                            <select
                              id="longStayDiscountType"
                              value={newLink.longStayDiscountType}
                              onChange={(e) => setNewLink(prev => ({ ...prev, longStayDiscountType: e.target.value as 'percentage' | 'flat' }))}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="percentage">Percentage Discount</option>
                              <option value="flat">Flat Amount Discount</option>
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="longStayDiscountValue">
                              {newLink.longStayDiscountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (PKR)'}
                            </Label>
                            <Input
                              id="longStayDiscountValue"
                              type="number"
                              min="0"
                              max={newLink.longStayDiscountType === 'percentage' ? 50 : undefined}
                              value={newLink.longStayDiscountValue}
                              onChange={(e) => setNewLink(prev => ({ ...prev, longStayDiscountValue: parseInt(e.target.value) || 0 }))}
                              placeholder={newLink.longStayDiscountType === 'percentage' ? "e.g., 10" : "e.g., 5000"}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preview Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">How It Works</h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Customers pay the same price as listed on the platform</p>
                        <p>• You earn <strong>{displayUser?.commissionRate || 10}% commission</strong> on every successful booking</p>
                        {newLink.longStayDiscountEnabled && newLink.longStayDiscountValue > 0 && (
                          <p>• Long-stay discount: {newLink.longStayDiscountType === 'percentage' ? `${newLink.longStayDiscountValue}%` : `${newLink.longStayDiscountValue} PKR`} off for stays ≥ {newLink.longStayMinDays} days</p>
                        )}
                        <p className="font-medium mt-2">
                          Example: Room at 10,000 PKR/night for 3 nights = 30,000 PKR
                        </p>
                        <p>Your commission: <strong>{((30000 * (displayUser?.commissionRate || 10)) / 100).toLocaleString()} PKR</strong> ({displayUser?.commissionRate || 10}%)</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleCreateLink}
                        className="px-8"
                      >
                        Create Commission Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Existing Links */}
            <Card>
              <CardHeader>
                <CardTitle>Your Affiliate Links</CardTitle>
              </CardHeader>
              <CardContent>
                {links.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No affiliate links created yet.</p>
                ) : (
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div key={link.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={link.isActive ? "default" : "secondary"}>
                              {link.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {formatLinkDescription(link)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center space-x-1">
                              <Eye className="w-4 h-4" />
                              <span>{link.clickCount} clicks</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{link.conversionCount} conversions</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Input
                            value={link.linkUrl}
                            readOnly
                            className="flex-1 text-sm"
                          />
                          <Button
                            onClick={() => copyToClipboard(link.linkUrl)}
                            variant="outline"
                            size="sm"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Link Management Controls */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleToggleLink(link.id, !link.isActive)}
                              variant="outline"
                              size="sm"
                              className={link.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            >
                              {link.isActive ? (
                                <>
                                  <PowerOff className="w-4 h-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleDeleteLink(link.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(link.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Withdrawal History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No withdrawal requests yet.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      You can request a withdrawal when you have approved commission balance.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawalRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              request.status === 'paid' ? 'default' :
                              request.status === 'approved' ? 'secondary' :
                              request.status === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                            <span className="font-medium">{request.amount.toLocaleString()} PKR</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Bank:</strong> {request.bankName}</p>
                          <p><strong>Account:</strong> {request.accountNumber} ({request.accountTitle})</p>
                          {request.adminNotes && (
                            <p><strong>Notes:</strong> {request.adminNotes}</p>
                          )}
                          {request.paymentReference && (
                            <p><strong>Payment Reference:</strong> {request.paymentReference}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Performance Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Conversion Metrics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Conversion Rate:</span>
                        <span className="font-semibold">{metrics.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Earnings per Booking:</span>
                        <span className="font-semibold">
                          {metrics.totalBookings > 0 ? Math.round(metrics.totalEarnings / metrics.totalBookings) : 0} PKR
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Performance Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Links Created:</span>
                        <span className="font-semibold">{links.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Links:</span>
                        <span className="font-semibold">{links.filter(l => l.isActive).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Withdrawal Dialog */}
        <Dialog open={isWithdrawing} onOpenChange={setIsWithdrawing}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Available Balance:</strong> {metrics.approvedEarnings.toLocaleString()} PKR
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Minimum withdrawal amount: 1,000 PKR
                </p>
              </div>

              <div>
                <Label htmlFor="amount">Withdrawal Amount (PKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1000"
                  max={metrics.approvedEarnings}
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={withdrawalForm.accountNumber}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <Label htmlFor="accountTitle">Account Title/Holder Name</Label>
                <Input
                  id="accountTitle"
                  value={withdrawalForm.accountTitle}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, accountTitle: e.target.value }))}
                  placeholder="Enter account holder name"
                />
              </div>

              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={withdrawalForm.bankName}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => setIsWithdrawing(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdrawal}
                  disabled={withdrawalMutation.isPending}
                  className="flex-1"
                >
                  {withdrawalMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
