import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Database,
  Link2,
  DollarSign,
  TrendingUp,
  UserPlus,
  Power,
  PowerOff,
  Trash2,
  CheckCircle,
  XCircle,
  Copy,
  Download,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  Users,
  User,
  Activity,
  Calendar,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LineChart,
  Settings,
  AlertTriangle,
  Clock,
  CreditCard,
  FileText,
  Mail,
  Phone,
  MapPin,
  Globe,
  Star,
  TrendingDown
} from "lucide-react";

// Enhanced API queries with better rate limiting and error handling
const useAffiliateLinks = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["affiliateLinks"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/links/all", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) throw new Error('Failed to fetch affiliate links');
    const data = await response.json();
    return data;
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

const useAffiliateEarnings = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["affiliateEarnings"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/earnings", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) throw new Error('Failed to fetch affiliate earnings');
    return response.json();
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

const useAffiliateWithdrawals = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["affiliateWithdrawals"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/admin/withdrawal-requests", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) throw new Error('Failed to fetch affiliate withdrawals');
    return response.json();
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

const useAffiliatePerformance = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["affiliatePerformance"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/admin/performance", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) throw new Error('Failed to fetch affiliate performance');
    return response.json();
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

const useAffiliateApplications = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["affiliateApplications"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/applications", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) throw new Error('Failed to fetch affiliate applications');
    return response.json();
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

const useAllAffiliates = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["allAffiliates"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    // Use the primary endpoint for fetching affiliates
    const endpoint = "/api/users?role=affiliate";
    
    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 429) {
        // Rate limited - throw error to trigger retry with backoff
        throw new Error('Rate limited - too many requests');
      }
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response formats
        let affiliatesData = [];
        if (Array.isArray(data)) {
          affiliatesData = data;
        } else if (data.users && Array.isArray(data.users)) {
          affiliatesData = data.users;
        } else if (data.affiliates && Array.isArray(data.affiliates)) {
          affiliatesData = data.affiliates;
        } else if (data.data && Array.isArray(data.data)) {
          affiliatesData = data.data;
        }
        
        // Since we're filtering by role in the API, we should get affiliates directly
        // But let's still filter just in case
        const filteredAffiliates = affiliatesData.filter((user: any) => 
          user.role === 'affiliate' || 
          user.userRole === 'affiliate' || 
          user.user_role === 'affiliate' ||
          user.roles?.includes('affiliate') ||
          user.isAffiliate === true
        );
        
        // Return the filtered affiliates, or all data if no filtering was needed
        return filteredAffiliates.length > 0 ? filteredAffiliates : affiliatesData;
      } else {
        // Return empty array for failed requests
        return [];
      }
    } catch (error) {
      
      // If rate limited, throw to trigger retry
      if (error instanceof Error && error.message?.includes('Rate limited')) {
        throw error;
      }
      
      // For other errors, return empty array
      return [];
    }
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    // Don't retry rate limit errors
    if (error?.message?.includes('Rate limited')) {
      return false;
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

// New query for affiliate metrics and analytics
const useAffiliateAnalytics = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["affiliateAnalytics"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/admin/analytics", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) {
      // If endpoint doesn't exist, return mock data structure
      return {
        totalRevenue: 0,
        totalCommissions: 0,
        conversionRate: 0,
        topPerformers: [],
        recentActivity: [],
        monthlyStats: []
      };
    }
    return response.json();
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

// New query for pending commissions specifically
const usePendingCommissions = (refetchInterval: number | false = false) => useQuery({
  queryKey: ["pendingCommissions"],
  queryFn: async () => {
    const token = localStorage.getItem('sitenest_token');
    const response = await fetch("/api/affiliate/earnings", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limited - too many requests');
    }
    
    if (!response.ok) throw new Error('Failed to fetch pending commissions');
    const allEarnings = await response.json();
    
    // Filter for pending commissions only
    return allEarnings.filter((earning: any) => earning.status === 'pending');
  },
  refetchInterval: refetchInterval,
  staleTime: 300000, // 5 minutes
  retry: (failureCount, error) => {
    if (error?.message?.includes('Rate limited')) {
      return false; // Don't retry rate limit errors
    }
    return failureCount < 1;
  },
  retryDelay: (attemptIndex) => Math.min(5000 * 2 ** attemptIndex, 30000),
});

export default function AffiliateManagement() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(false); // Start with auto-refresh disabled to prevent initial rate limiting
  const [rateLimited, setRateLimited] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Enhanced dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, linkId?: number }>({ open: false });
  const [approveEarningDialog, setApproveEarningDialog] = useState<{ open: boolean, earningId?: number, notes: string }>({ open: false, notes: "" });
  const [rejectEarningDialog, setRejectEarningDialog] = useState<{ open: boolean, earningId?: number, notes: string }>({ open: false, notes: "" });
  const [approveWithdrawalDialog, setApproveWithdrawalDialog] = useState<{ open: boolean, requestId?: number, notes: string }>({ open: false, notes: "" });
  const [rejectWithdrawalDialog, setRejectWithdrawalDialog] = useState<{ open: boolean, requestId?: number, notes: string }>({ open: false, notes: "" });
  const [markPaidDialog, setMarkPaidDialog] = useState<{ open: boolean, requestId?: number }>({ open: false });
  const [restrictAffiliateDialog, setRestrictAffiliateDialog] = useState<{ open: boolean, affiliateId?: number, reason: string }>({ open: false, reason: "" });
  const [editCommissionDialog, setEditCommissionDialog] = useState<{ open: boolean, affiliateId?: string, currentRate: number, newRate: string }>({ open: false, currentRate: 10, newRate: "" });

  // Disable auto-refresh completely to prevent rate limiting
  const refetchInterval = false;
  
  const { data: links = [], isLoading: linksLoading, error: linksError } = useAffiliateLinks(refetchInterval);
  const { data: earnings = [], isLoading: earningsLoading, error: earningsError } = useAffiliateEarnings(refetchInterval);
  const { data: withdrawals = [], isLoading: withdrawalsLoading, error: withdrawalsError } = useAffiliateWithdrawals(refetchInterval);
  const { data: performance = [], isLoading: performanceLoading, error: performanceError } = useAffiliatePerformance(refetchInterval);
  const { error: applicationsError } = useAffiliateApplications(refetchInterval);
  const { data: affiliates = [], isLoading: affiliatesLoading, error: affiliatesError } = useAllAffiliates(refetchInterval);
  const { error: analyticsError } = useAffiliateAnalytics(refetchInterval);
  const { data: pendingCommissions = [], isLoading: pendingCommissionsLoading, error: pendingCommissionsError } = usePendingCommissions(refetchInterval);

  // Debug logging to understand data structure


  // Check for rate limiting errors and show notification
  React.useEffect(() => {
    const errors = [linksError, earningsError, withdrawalsError, performanceError, applicationsError, affiliatesError, analyticsError, pendingCommissionsError];
    const rateLimitError = errors.find(error => error?.message?.includes('Rate limited'));
    
    if (rateLimitError && !rateLimited) {
      setRateLimited(true);
      setAutoRefresh(false); // Disable auto-refresh when rate limited
      toast({
        title: "Rate Limited",
        description: "Too many requests. Auto-refresh has been disabled. Please wait before manually refreshing.",
        variant: "destructive",
        duration: 10000,
      });
      
      // Reset rate limited status after 2 minutes
      setTimeout(() => {
        setRateLimited(false);
        toast({
          title: "Rate Limit Reset",
          description: "You can now enable auto-refresh again.",
          duration: 5000,
        });
      }, 120000);
    }
  }, [linksError, earningsError, withdrawalsError, performanceError, applicationsError, affiliatesError, analyticsError, rateLimited, toast]);

  // Define missing variables
  const affiliatesPerformanceLoading = performanceLoading;
  const affiliatesPerformance = performance;
  
  // Debug logging to understand data structure
  console.log('Debug - Affiliates data:', { 
    affiliates: affiliates, 
    affiliatesLength: affiliates.length,
    links: links, 
    linksLength: links.length,
    earnings: earnings,
    earningsLength: earnings.length,
    performance: affiliatesPerformance,
    affiliatesLoading,
    linksLoading,
    earningsLoading
  });
  
  // Filter data for selected affiliate with multiple property support
  const affiliateLinks = selectedAffiliate ? links.filter((l: any) => 
    l.affiliateId === selectedAffiliate.id || 
    l.affiliate_id === selectedAffiliate.id || 
    l.userId === selectedAffiliate.id ||
    l.user_id === selectedAffiliate.id
  ) : [];
  
  const affiliateEarnings = selectedAffiliate ? earnings.filter((e: any) => 
    e.affiliateId === selectedAffiliate.id || 
    e.affiliate_id === selectedAffiliate.id || 
    e.userId === selectedAffiliate.id ||
    e.user_id === selectedAffiliate.id
  ) : [];
  
  const affiliateWithdrawals = selectedAffiliate ? withdrawals.filter((w: any) => 
    w.affiliateId === selectedAffiliate.id || 
    w.affiliate_id === selectedAffiliate.id || 
    w.userId === selectedAffiliate.id ||
    w.user_id === selectedAffiliate.id
  ) : [];



  // Enhanced mutations with better error handling
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/admin/links/${linkId}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete affiliate link");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateLinks"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Affiliate link deleted successfully. ${data.deletedMetricsCount || 0} associated metrics removed.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete affiliate link.",
        variant: "destructive"
      });
    },
  });

  const toggleLinkMutation = useMutation({
    mutationFn: async ({ linkId, isActive }: { linkId: number; isActive: boolean }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/admin/links/${linkId}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to toggle link status");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateLinks"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Link ${data.link?.isActive ? 'activated' : 'deactivated'} successfully.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update link status.",
        variant: "destructive"
      });
    },
  });

  const approveEarningMutation = useMutation({
    mutationFn: async ({ earningId, notes }: { earningId: number; notes?: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/earnings/${earningId}/approve`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve earning");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateEarnings"] });
      queryClient.invalidateQueries({ queryKey: ["pendingCommissions"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Commission of PKR ${data.earning?.commissionAmount || 0} approved successfully. Affiliate can now request withdrawal.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve earning.",
        variant: "destructive"
      });
    },
  });

  const rejectEarningMutation = useMutation({
    mutationFn: async ({ earningId, notes }: { earningId: number; notes: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/earnings/${earningId}/reject`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject earning");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateEarnings"] });
      queryClient.invalidateQueries({ queryKey: ["pendingCommissions"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Commission of PKR ${data.earning?.commissionAmount || 0} rejected.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reject earning.",
        variant: "destructive"
      });
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: number; adminNotes?: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/admin/withdrawal-requests/${requestId}/approve`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve withdrawal request");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Withdrawal request of PKR ${data.withdrawalRequest?.amount || 0} approved.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve withdrawal request.",
        variant: "destructive"
      });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: number; adminNotes: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/admin/withdrawal-requests/${requestId}/reject`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject withdrawal request");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Withdrawal request of PKR ${data.withdrawalRequest?.amount || 0} rejected.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reject withdrawal request.",
        variant: "destructive"
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ requestId, paymentMethod, paymentReference, adminNotes }: { 
      requestId: number; 
      paymentMethod?: string; 
      paymentReference?: string; 
      adminNotes?: string; 
    }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/admin/withdrawal-requests/${requestId}/mark-paid`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod, paymentReference, adminNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to mark withdrawal as paid");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateWithdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Withdrawal of PKR ${data.withdrawalRequest?.amount || 0} marked as paid.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to mark withdrawal as paid.",
        variant: "destructive"
      });
    },
  });

  // New mutations for application management
  const approveApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, reviewNotes }: { applicationId: number; reviewNotes?: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/applications/${applicationId}/review`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: "approved", reviewNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve application");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateApplications"] });
      queryClient.invalidateQueries({ queryKey: ["allAffiliates"] });
      toast({ 
        title: "Success", 
        description: `Application approved. User promoted to affiliate.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to approve application.",
        variant: "destructive"
      });
    },
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, reviewNotes }: { applicationId: number; reviewNotes: string }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/applications/${applicationId}/review`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: "rejected", reviewNotes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject application");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliateApplications"] });
      toast({ 
        title: "Success", 
        description: `Application rejected.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reject application.",
        variant: "destructive"
      });
    },
  });

  // Restrict affiliate mutation
  const restrictAffiliateMutation = useMutation({
    mutationFn: async ({ affiliateId, reason, isRestricted }: { affiliateId: number; reason?: string; isRestricted: boolean }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/users/${affiliateId}/restrict`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isRestricted, reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update affiliate status");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allAffiliates"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Affiliate ${data.user?.isRestricted ? 'restricted' : 'unrestricted'} successfully.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update affiliate status.",
        variant: "destructive"
      });
    },
  });

  // Update commission rate mutation
  const updateCommissionRateMutation = useMutation({
    mutationFn: async ({ affiliateId, commissionRate }: { affiliateId: string; commissionRate: number }) => {
      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`/api/affiliate/admin/commission-rate/${affiliateId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commissionRate }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update commission rate");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allAffiliates"] });
      queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
      toast({ 
        title: "Success", 
        description: `Commission rate updated to ${data.affiliate?.commissionRate}% successfully.` 
      });
      setEditCommissionDialog({ open: false, affiliateId: undefined, currentRate: 10, newRate: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update commission rate.",
        variant: "destructive"
      });
    },
  });

  // Handlers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const handleToggleLink = (linkId: number, isActive: boolean) => {
    toggleLinkMutation.mutate({ linkId, isActive });
  };

  const handleDeleteLink = (linkId: number) => {
    setDeleteDialog({ open: true, linkId });
  };
  const confirmDeleteLink = () => {
    if (deleteDialog.linkId) {
      deleteLinkMutation.mutate(deleteDialog.linkId);
    }
    setDeleteDialog({ open: false });
  };

  const handleApproveEarning = (earningId: number) => {
    setApproveEarningDialog({ open: true, earningId, notes: "" });
  };
  const confirmApproveEarning = () => {
    if (approveEarningDialog.earningId !== undefined) {
      approveEarningMutation.mutate({ earningId: approveEarningDialog.earningId, notes: approveEarningDialog.notes || undefined });
    }
    setApproveEarningDialog({ open: false, earningId: undefined, notes: "" });
  };

  const handleRejectEarning = (earningId: number) => {
    setRejectEarningDialog({ open: true, earningId, notes: "" });
  };
  const confirmRejectEarning = () => {
    if (rejectEarningDialog.earningId !== undefined && rejectEarningDialog.notes) {
      rejectEarningMutation.mutate({ earningId: rejectEarningDialog.earningId, notes: rejectEarningDialog.notes });
    }
    setRejectEarningDialog({ open: false, earningId: undefined, notes: "" });
  };

  const handleApproveWithdrawal = (requestId: number) => {
    setApproveWithdrawalDialog({ open: true, requestId, notes: "" });
  };
  const confirmApproveWithdrawal = () => {
    if (approveWithdrawalDialog.requestId !== undefined) {
      approveWithdrawalMutation.mutate({ requestId: approveWithdrawalDialog.requestId, adminNotes: approveWithdrawalDialog.notes || undefined });
    }
    setApproveWithdrawalDialog({ open: false, requestId: undefined, notes: "" });
  };

  const handleRejectWithdrawal = (requestId: number) => {
    setRejectWithdrawalDialog({ open: true, requestId, notes: "" });
  };
  const confirmRejectWithdrawal = () => {
    if (rejectWithdrawalDialog.requestId !== undefined && rejectWithdrawalDialog.notes) {
      rejectWithdrawalMutation.mutate({ requestId: rejectWithdrawalDialog.requestId, adminNotes: rejectWithdrawalDialog.notes });
    }
    setRejectWithdrawalDialog({ open: false, requestId: undefined, notes: "" });
  };

  const handleMarkPaid = (requestId: number) => {
    setMarkPaidDialog({ open: true, requestId });
  };
  const confirmMarkPaid = () => {
    if (markPaidDialog.requestId !== undefined) {
      markPaidMutation.mutate({ requestId: markPaidDialog.requestId });
    }
    setMarkPaidDialog({ open: false, requestId: undefined });
  };

  const handleRestrictAffiliate = (affiliateId: number) => {
    setRestrictAffiliateDialog({ open: true, affiliateId, reason: "" });
  };
  const confirmRestrictAffiliate = () => {
    if (restrictAffiliateDialog.affiliateId !== undefined) {
      restrictAffiliateMutation.mutate({ 
        affiliateId: restrictAffiliateDialog.affiliateId, 
        reason: restrictAffiliateDialog.reason,
        isRestricted: true 
      });
    }
    setRestrictAffiliateDialog({ open: false, affiliateId: undefined, reason: "" });
  };

  const handleUnrestrictAffiliate = (affiliateId: number) => {
    restrictAffiliateMutation.mutate({ 
      affiliateId, 
      isRestricted: false 
    });
  };

  const handleEditCommissionRate = (affiliateId: string, currentRate: number) => {
    setEditCommissionDialog({ 
      open: true, 
      affiliateId, 
      currentRate, 
      newRate: currentRate.toString() 
    });
  };

  const confirmUpdateCommissionRate = () => {
    if (editCommissionDialog.affiliateId && editCommissionDialog.newRate) {
      const newRate = parseFloat(editCommissionDialog.newRate);
      if (isNaN(newRate) || newRate < 0 || newRate > 100) {
        toast({
          title: "Invalid Commission Rate",
          description: "Commission rate must be a number between 0 and 100.",
          variant: "destructive"
        });
        return;
      }
      updateCommissionRateMutation.mutate({ 
        affiliateId: editCommissionDialog.affiliateId, 
        commissionRate: newRate 
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Rate Limit Warning */}
      {rateLimited && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Rate Limit Detected</p>
                <p className="text-sm">Too many requests were made. Auto-refresh has been disabled. Use the "Refresh Data" button to manually update information with delays between requests.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Link2 className="w-8 h-8 text-sitenest-primary" />
            <span>Affiliate Management</span>
          </h2>
          <p className="text-gray-600">View and manage affiliate links, earnings, and withdrawals</p>
        </div>
        <div className="flex items-center gap-2">
          {rateLimited && (
            <Badge variant="destructive" className="mr-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Rate Limited
            </Badge>
          )}
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            disabled={rateLimited}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["affiliateLinks"] });
              queryClient.invalidateQueries({ queryKey: ["affiliateEarnings"] });
              queryClient.invalidateQueries({ queryKey: ["affiliateWithdrawals"] });
              queryClient.invalidateQueries({ queryKey: ["affiliatePerformance"] });
              queryClient.invalidateQueries({ queryKey: ["allAffiliates"] });
              queryClient.invalidateQueries({ queryKey: ["affiliateAnalytics"] });
              toast({
                title: "Data Refreshed",
                description: "All affiliate data has been refreshed.",
              });
            }}
            disabled={rateLimited}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Manual Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-gray-500"
          >
            <Settings className="h-4 w-4 mr-1" />
            Debug
          </Button>
        </div>
      </div>

      {/* Debug Information Panel */}
      {showDebugInfo && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <strong>Affiliates:</strong> {affiliates.length}
                <br />
                <strong>Loading:</strong> {affiliatesLoading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Links:</strong> {links.length}
                <br />
                <strong>Loading:</strong> {linksLoading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Earnings:</strong> {earnings.length}
                <br />
                <strong>Loading:</strong> {earningsLoading ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Performance:</strong> {affiliatesPerformance.length}
                <br />
                <strong>Loading:</strong> {performanceLoading ? 'Yes' : 'No'}
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={async () => {
                  const token = localStorage.getItem('sitenest_token');
                  try {
                    const response = await fetch("/api/users?role=affiliate", {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    console.log('API Test Result:', { status: response.status, data });
                    toast({
                      title: "API Test Complete",
                      description: `Status: ${response.status}, Data length: ${Array.isArray(data) ? data.length : 'Not array'}`,
                    });
                  } catch (error) {
                    console.error('API Test Error:', error);
                    toast({
                      title: "API Test Failed",
                      description: String(error),
                      variant: "destructive"
                    });
                  }
                }}
              >
                Test API
              </Button>
            </div>
            
            {affiliates.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Sample Affiliate Data</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(affiliates[0], null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics Summary */}
      {performanceLoading ? (
        <div className="text-center py-4">Loading statistics...</div>
      ) : (
        (() => {
          // Calculate statistics from actual data
          const totalLinks = performance.total_links ?? performance.totalLinks ?? links.length;
          const totalClicks = performance.total_clicks ?? performance.totalClicks ?? 
            links.reduce((sum: number, link: any) => sum + (link.clickCount || link.click_count || 0), 0);
          
          const totalEarnings = performance.total_earnings ?? performance.totalEarnings ?? 
            earnings.reduce((sum: number, e: any) => {
              const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
              return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
            }, 0);
          
          const totalReferrals = performance.total_referrals ?? performance.totalReferrals ?? 
            earnings.filter((e: any) => e.status === 'approved' || e.status === 'paid').length;
          
          const pendingCommissionsAmount = pendingCommissions.length > 0 
            ? pendingCommissions.reduce((sum: number, e: any) => {
                const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
                return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
              }, 0)
            : earnings
              .filter((e: any) => e.status === 'pending')
              .reduce((sum: number, e: any) => {
                const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
                return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
              }, 0);
          
          const releasedAmount = earnings
            .filter((e: any) => e.status === 'approved' || e.status === 'paid' || e.status === 'withdrawn')
            .reduce((sum: number, e: any) => {
              const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
              return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
            }, 0);

          return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Link2 className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
                  <div className="text-2xl font-bold">{totalLinks}</div>
                  <p className="text-sm text-gray-600">Affiliate Links</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <TrendingUp className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
                  <div className="text-2xl font-bold">{totalClicks}</div>
                  <p className="text-sm text-gray-600">Total Clicks</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <DollarSign className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
                  <div className="text-2xl font-bold">PKR {totalEarnings.toFixed(2)}</div>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <UserPlus className="h-8 w-8 mx-auto text-sitenest-primary mb-2" />
                  <div className="text-2xl font-bold">{totalReferrals}</div>
                  <p className="text-sm text-gray-600">Total Referrals</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <div className="text-2xl font-bold">PKR {pendingCommissionsAmount.toFixed(2)}</div>
                  <p className="text-sm text-gray-600">Pending Commission</p>
                  {pendingCommissions.length > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">{pendingCommissions.length} requests</p>
                  )}
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold">PKR {releasedAmount.toFixed(2)}</div>
                  <p className="text-sm text-gray-600">Released Amount</p>
                </CardContent>
              </Card>
            </div>
          );
        })()
      )}


      {/* Tabbed Data Section */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        <TabsContent value={selectedTab} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold capitalize">{selectedTab.replace(/([A-Z])/g, ' $1').trim()}</h3>
            <Button variant="outline" onClick={() => window.location.reload()}>Refresh Data</Button>
          </div>
          {/* Links Tab */}
          {selectedTab === "links" && (
            linksLoading ? <div className="text-center py-8">Loading links...</div> :
            links.length === 0 ? <div className="text-center py-8">No affiliate links found</div> :
            <div className="space-y-4">
              {links.map((link: any) => (
                <Card key={link.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span className="font-mono text-xs">{link.linkUrl}</span>
                      <div className="flex items-center gap-2">
                        <Badge color={link.isActive ? "green" : "red"}>{link.isActive ? "Active" : "Inactive"}</Badge>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard(link.linkUrl)}><Copy size={16} /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleToggleLink(link.id, !link.isActive)}>
                          {link.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteLink(link.id)}><Trash2 size={16} /></Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div><strong>Clicks:</strong> {link.clickCount}</div>
                      <div><strong>Created:</strong> {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : '-'}</div>
                      <div><strong>Affiliate:</strong> {link.affiliateFirstName || ''} {link.affiliateLastName || ''} {link.affiliateEmail ? `(${link.affiliateEmail})` : ''}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Earnings Tab */}
          {selectedTab === "earnings" && (
            earningsLoading ? <div className="text-center py-8">Loading earnings...</div> :
            earnings.length === 0 ? <div className="text-center py-8">No earnings found</div> :
            <div className="space-y-4">
              {earnings.map((earning: any) => (
                <Card key={earning.id} className={`shadow-sm border-l-4 ${
                  earning.status === 'approved' ? 'border-l-green-500' :
                  earning.status === 'pending' ? 'border-l-yellow-500' :
                  earning.status === 'withdrawn' ? 'border-l-blue-500' :
                  'border-l-red-500'
                }`}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">
                          {earning.affiliateName || earning.affiliateFirstName || 'Unknown Affiliate'}
                        </span>
                        <span className={`text-xl font-bold ${
                          earning.status === 'approved' ? 'text-green-600' :
                          earning.status === 'pending' ? 'text-yellow-600' :
                          earning.status === 'withdrawn' ? 'text-blue-600' :
                          'text-red-600'
                        }`}>
                          PKR {(earning.commissionAmount || earning.commission_amount || earning.amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            earning.status === 'approved' ? 'default' : 
                            earning.status === 'pending' ? 'secondary' : 
                            earning.status === 'withdrawn' ? 'outline' :
                            'destructive'
                          }
                          className={
                            earning.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                            earning.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                            earning.status === 'withdrawn' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            'bg-red-100 text-red-800 border-red-300'
                          }
                        >
                          {earning.status}
                        </Badge>
                        {earning.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveEarning(earning.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRejectEarning(earning.id)}
                              className="text-red-600 hover:text-red-700 border-red-200"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span><strong>Base Amount:</strong> PKR {(earning.baseAmount || 0).toLocaleString('en-PK')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <span><strong>Commission Rate:</strong> {earning.commissionRate || 10}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span><strong>Created:</strong> {earning.createdAt ? new Date(earning.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span><strong>Booking ID:</strong> #{earning.bookingId || 'N/A'}</span>
                      </div>
                      {earning.notes && (
                        <div className="col-span-full flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span><strong>Notes:</strong> {earning.notes}</span>
                        </div>
                      )}
                      {earning.affiliateEmail && (
                        <div className="col-span-full flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span><strong>Affiliate Email:</strong> {earning.affiliateEmail}</span>
                        </div>
                      )}
                      {earning.approvedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Approved:</strong> {new Date(earning.approvedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {earning.withdrawalDate && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-500" />
                          <span><strong>Withdrawn:</strong> {new Date(earning.withdrawalDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Withdrawals Tab */}
          {selectedTab === "withdrawals" && (
            withdrawalsLoading ? <div className="text-center py-8">Loading withdrawals...</div> :
            withdrawals.length === 0 ? <div className="text-center py-8">No withdrawal requests found</div> :
            <div className="space-y-4">
              {withdrawals.map((w: any) => (
                <Card key={w.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{w.affiliateName}</span>
                      <div className="flex items-center gap-2">
                        <Badge color={w.status === "approved" ? "green" : w.status === "pending" ? "yellow" : w.status === "paid" ? "blue" : "red"}>{w.status}</Badge>
                        {w.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleApproveWithdrawal(w.id)}><CheckCircle size={16} /> Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectWithdrawal(w.id)}><XCircle size={16} /> Reject</Button>
                          </>
                        )}
                        {w.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkPaid(w.id)}><DollarSign size={16} /> Mark Paid</Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div><strong>Amount:</strong> ${typeof w.amount === 'number' ? w.amount.toFixed(2) : '0.00'}</div>
                      <div><strong>Requested At:</strong> {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : '-'}</div>
                      <div><strong>Bank:</strong> {w.bankName || '-'}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Performance Tab */}
          {selectedTab === "performance" && (
            performanceLoading ? <div className="text-center py-8">Loading performance...</div> :
            <div className="space-y-6">
              {/* Individual Affiliate Performance Charts */}
              <div>
                
                {affiliates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No affiliates to display</div>
                ) : (
                  <div className="grid gap-4">
                    {affiliates.map((affiliate: any) => {
                      // Calculate individual affiliate stats
                      const affiliateLinks = links.filter((l: any) => 
                        l.affiliateId === affiliate.id || l.affiliate_id === affiliate.id || 
                        l.userId === affiliate.id || l.user_id === affiliate.id
                      );
                      
                      const affiliateEarnings = earnings.filter((e: any) => 
                        e.affiliateId === affiliate.id || e.affiliate_id === affiliate.id || 
                        e.userId === affiliate.id || e.user_id === affiliate.id
                      );
                      
                      const totalClicks = affiliateLinks.reduce((sum: number, link: any) => 
                        sum + (link.clickCount || link.click_count || 0), 0);
                      
                      const totalEarnings = affiliateEarnings.reduce((sum: number, e: any) => {
                        const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
                        return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
                      }, 0);
                      
                      const pendingEarnings = affiliateEarnings
                        .filter((e: any) => e.status === 'pending')
                        .reduce((sum: number, e: any) => {
                          const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
                          return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
                        }, 0);
                      
                      const approvedEarnings = affiliateEarnings
                        .filter((e: any) => e.status === 'approved' || e.status === 'paid')
                        .reduce((sum: number, e: any) => {
                          const amount = e.commissionAmount || e.commission_amount || e.amount || 0;
                          return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
                        }, 0);

                      return (
                        <Card key={affiliate.id} className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h5 className="font-semibold text-lg">
                                {affiliate.firstName || affiliate.first_name || affiliate.name || ''} {affiliate.lastName || affiliate.last_name || ''}
                                {affiliate.full_name && !affiliate.firstName && !affiliate.first_name ? affiliate.full_name : ''}
                              </h5>
                              <p className="text-sm text-gray-600">{affiliate.email}</p>
                              {affiliate.isRestricted && (
                                <Badge variant="destructive" className="mt-1">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Restricted
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {affiliate.isRestricted ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleUnrestrictAffiliate(affiliate.id)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Unrestrict
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleRestrictAffiliate(affiliate.id)}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  Restrict
                                </Button>
                              )}

                            </div>
                          </div>
                          
                          {/* Commission Rate Control */}
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-gray-600" />
                                <span className="font-medium text-gray-700">Commission Rate:</span>
                                <Badge variant="secondary" className="text-lg font-bold">
                                  {affiliate.commissionRate || affiliate.commission_rate || 10}%
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCommissionRate(
                                  affiliate.id, 
                                  affiliate.commissionRate || affiliate.commission_rate || 10
                                )}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Rate
                              </Button>
                            </div>
                          </div>

                          {/* Performance Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded">
                              <Link2 className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                              <div className="text-xl font-bold text-blue-600">{affiliateLinks.length}</div>
                              <div className="text-xs text-gray-600">Links</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded">
                              <TrendingUp className="h-6 w-6 mx-auto text-green-600 mb-1" />
                              <div className="text-xl font-bold text-green-600">{totalClicks}</div>
                              <div className="text-xs text-gray-600">Clicks</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded">
                              <DollarSign className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                              <div className="text-xl font-bold text-purple-600">PKR {totalEarnings.toFixed(0)}</div>
                              <div className="text-xs text-gray-600">Total Earnings</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded">
                              <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                              <div className="text-xl font-bold text-yellow-600">PKR {pendingEarnings.toFixed(0)}</div>
                              <div className="text-xs text-gray-600">Pending</div>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded">
                              <CheckCircle className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                              <div className="text-xl font-bold text-emerald-600">PKR {approvedEarnings.toFixed(0)}</div>
                              <div className="text-xs text-gray-600">Approved</div>
                            </div>
                          </div>
                          
                          {/* Performance Bar Chart */}
                          <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Performance Overview</span>
                              <span>{totalEarnings > 0 ? `${((approvedEarnings / totalEarnings) * 100).toFixed(1)}% Approved` : 'No earnings yet'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div className="flex h-3 rounded-full overflow-hidden">
                                {totalEarnings > 0 && (
                                  <>
                                    <div 
                                      className="bg-emerald-500" 
                                      style={{ width: `${(approvedEarnings / totalEarnings) * 100}%` }}
                                    ></div>
                                    <div 
                                      className="bg-yellow-500" 
                                      style={{ width: `${(pendingEarnings / totalEarnings) * 100}%` }}
                                    ></div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Approved: PKR {approvedEarnings.toFixed(2)}</span>
                              <span>Pending: PKR {pendingEarnings.toFixed(2)}</span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      {/* Dialogs (unchanged) */}
      <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Affiliate Link</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this affiliate link? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
            <Button className="bg-red-600 text-white" onClick={confirmDeleteLink}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={approveEarningDialog.open} onOpenChange={open => setApproveEarningDialog({ ...approveEarningDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Earning</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Add approval notes (optional)"
            value={approveEarningDialog.notes}
            onChange={e => setApproveEarningDialog({ ...approveEarningDialog, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setApproveEarningDialog({ open: false, earningId: undefined, notes: "" })}>Cancel</Button>
            <Button className="bg-green-600 text-white" onClick={confirmApproveEarning}>Approve</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={rejectEarningDialog.open} onOpenChange={open => setRejectEarningDialog({ ...rejectEarningDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Earning</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Add rejection reason (required)"
            value={rejectEarningDialog.notes}
            onChange={e => setRejectEarningDialog({ ...rejectEarningDialog, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectEarningDialog({ open: false, earningId: undefined, notes: "" })}>Cancel</Button>
            <Button className="bg-red-600 text-white" disabled={!rejectEarningDialog.notes} onClick={confirmRejectEarning}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={approveWithdrawalDialog.open} onOpenChange={open => setApproveWithdrawalDialog({ ...approveWithdrawalDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal Request</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Add approval notes (optional)"
            value={approveWithdrawalDialog.notes}
            onChange={e => setApproveWithdrawalDialog({ ...approveWithdrawalDialog, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setApproveWithdrawalDialog({ open: false, requestId: undefined, notes: "" })}>Cancel</Button>
            <Button className="bg-green-600 text-white" onClick={confirmApproveWithdrawal}>Approve</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={rejectWithdrawalDialog.open} onOpenChange={open => setRejectWithdrawalDialog({ ...rejectWithdrawalDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Add rejection reason (required)"
            value={rejectWithdrawalDialog.notes}
            onChange={e => setRejectWithdrawalDialog({ ...rejectWithdrawalDialog, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectWithdrawalDialog({ open: false, requestId: undefined, notes: "" })}>Cancel</Button>
            <Button className="bg-red-600 text-white" disabled={!rejectWithdrawalDialog.notes} onClick={confirmRejectWithdrawal}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={markPaidDialog.open} onOpenChange={open => setMarkPaidDialog({ ...markPaidDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Withdrawal as Paid</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to mark this withdrawal as paid?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setMarkPaidDialog({ open: false, requestId: undefined })}>Cancel</Button>
            <Button className="bg-blue-600 text-white" onClick={confirmMarkPaid}>Mark as Paid</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Restrict Affiliate Dialog */}
      <Dialog open={restrictAffiliateDialog.open} onOpenChange={open => setRestrictAffiliateDialog({ ...restrictAffiliateDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restrict Affiliate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            Restricting an affiliate will prevent them from creating new links and earning commissions. 
            Existing links will be deactivated.
          </p>
          <Textarea
            placeholder="Reason for restriction (required)"
            value={restrictAffiliateDialog.reason}
            onChange={e => setRestrictAffiliateDialog({ ...restrictAffiliateDialog, reason: e.target.value })}
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRestrictAffiliateDialog({ open: false, affiliateId: undefined, reason: "" })}>Cancel</Button>
            <Button 
              className="bg-red-600 text-white" 
              disabled={!restrictAffiliateDialog.reason.trim()} 
              onClick={confirmRestrictAffiliate}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Restrict Affiliate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Commission Rate Dialog */}
      <Dialog open={editCommissionDialog.open} onOpenChange={open => setEditCommissionDialog({ ...editCommissionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set the commission rate for this affiliate. This will be used for all future earnings calculations.
            </p>
            <div className="space-y-2">
              <Label htmlFor="commission-rate">Commission Rate (%)</Label>
              <Input
                id="commission-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Enter commission rate (0-100)"
                value={editCommissionDialog.newRate}
                onChange={e => setEditCommissionDialog({ ...editCommissionDialog, newRate: e.target.value })}
                className="text-center text-lg font-semibold"
              />
              <p className="text-xs text-gray-500">
                Current rate: {editCommissionDialog.currentRate}% • Valid range: 0-100%
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setEditCommissionDialog({ open: false, affiliateId: undefined, currentRate: 10, newRate: "" })}
            >
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 text-white" 
              disabled={!editCommissionDialog.newRate || updateCommissionRateMutation.isPending}
              onClick={confirmUpdateCommissionRate}
            >
              {updateCommissionRateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-1" />
                  Update Rate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
