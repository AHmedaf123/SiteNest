import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import { log } from './utils/logger';
import {
  affiliateApplications,
  affiliateLinks,
  affiliateMetrics,
  users,
  bookingRequests,
  apartments,
  type AffiliateApplication,
  type AffiliateLink,
  type AffiliateMetric,
  affiliateApplicationValidation,
  affiliateLinkValidation,
  withdrawalRequestValidation,
  type AffiliateApplicationData,
  type AffiliateLinkData,
  type WithdrawalRequestData
} from '@shared/schema';
import { authenticateToken } from './auth-routes';
import { requireRole, requirePermission, promoteToAffiliate, isAdmin, isSuperAdmin } from './role-utils';
import { emitAffiliateApplicationSubmitted, emitAffiliateApplicationReviewed, emitAffiliateLinkCreated } from './dashboard-events';
import crypto from 'crypto';
import { storage } from './storage';

const router = Router();

// Apply affiliate application
router.post('/applications', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user already has a pending or approved application
    const existingApplication = await db.select()
      .from(affiliateApplications)
      .where(eq(affiliateApplications.userId, user.id))
      .limit(1);

    if (existingApplication.length > 0) {
      const status = existingApplication[0].status;
      if (status === 'pending') {
        return res.status(400).json({ error: 'You already have a pending application' });
      } else if (status === 'approved') {
        return res.status(400).json({ error: 'You are already an approved affiliate' });
      }
    }

    const validatedData = affiliateApplicationValidation.parse(req.body) as AffiliateApplicationData;

    const application = await db.insert(affiliateApplications).values({
      userId: user.id,
      fullName: validatedData.fullName,
      email: validatedData.email,
      phone: validatedData.phone,
      experience: validatedData.experience,
      motivation: validatedData.motivation,
      marketingPlan: validatedData.marketingPlan,
      socialMediaLinks: validatedData.socialMediaLinks || null,
      status: 'pending'
    }).returning();

    // Emit real-time update to admin dashboard
    emitAffiliateApplicationSubmitted(application[0]);

    res.json({
      message: 'Application submitted successfully',
      application: application[0]
    });

  } catch (error: any) {
    console.error('Affiliate application error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's affiliate application status
router.get('/applications/my-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const application = await db.select()
      .from(affiliateApplications)
      .where(eq(affiliateApplications.userId, user.id))
      .orderBy(desc(affiliateApplications.createdAt))
      .limit(1);

    if (application.length === 0) {
      return res.json({ status: 'none' });
    }

    res.json({
      status: application[0].status,
      application: application[0]
    });

  } catch (error) {
    console.error('Get application status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all affiliate applications (Admin only)
router.get('/applications', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const applications = await db.select({
      id: affiliateApplications.id,
      userId: affiliateApplications.userId,
      fullName: affiliateApplications.fullName,
      email: affiliateApplications.email,
      phone: affiliateApplications.phone,
      experience: affiliateApplications.experience,
      motivation: affiliateApplications.motivation,
      marketingPlan: affiliateApplications.marketingPlan,
      socialMediaLinks: affiliateApplications.socialMediaLinks,
      status: affiliateApplications.status,
      reviewedBy: affiliateApplications.reviewedBy,
      reviewNotes: affiliateApplications.reviewNotes,
      reviewedAt: affiliateApplications.reviewedAt,
      createdAt: affiliateApplications.createdAt,
      updatedAt: affiliateApplications.updatedAt,
      // User details
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userProfileImage: users.profileImageUrl
    })
    .from(affiliateApplications)
    .leftJoin(users, eq(affiliateApplications.userId, users.id))
    .orderBy(desc(affiliateApplications.createdAt));

    res.json(applications);

  } catch (error) {
    console.error('Get affiliate applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Review affiliate application (Admin only)
router.put('/applications/:id/review', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const applicationId = parseInt(req.params.id);
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    // Get the application
    const application = await db.select()
      .from(affiliateApplications)
      .where(eq(affiliateApplications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application status
    const updatedApplication = await db.update(affiliateApplications)
      .set({
        status,
        reviewedBy: user.id,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(affiliateApplications.id, applicationId))
      .returning();

    // If approved, promote user to affiliate role
    if (status === 'approved') {
      const success = await promoteToAffiliate(application[0].userId);
      if (!success) {
        console.error('Failed to promote user to affiliate role');
      }
    }

    // Emit real-time update to admin dashboard and affiliate
    emitAffiliateApplicationReviewed(updatedApplication[0]);

    res.json({
      message: `Application ${status} successfully`,
      application: updatedApplication[0]
    });

  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate affiliate link (Affiliate only)
router.post('/links', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = affiliateLinkValidation.parse(req.body) as AffiliateLinkData;

    // Generate unique link code
    const linkCode = crypto.randomBytes(8).toString('hex');
    const linkUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/api/track/affiliate/${linkCode}`;

    const link = await db.insert(affiliateLinks).values({
      affiliateId: user.id,
      linkCode,
      linkUrl,
      // NEW COMMISSION-BASED SYSTEM FIELDS
      longStayDiscountEnabled: validatedData.longStayDiscountEnabled || false,
      longStayMinDays: validatedData.longStayMinDays || 5,
      longStayDiscountType: validatedData.longStayDiscountType || 'percentage',
      longStayDiscountValue: validatedData.longStayDiscountValue || 0,
      // Legacy fields (for backward compatibility)
      priceAdjustment: validatedData.priceAdjustment || 0,
      adjustmentType: validatedData.adjustmentType || 'add',
      discountPercentage: validatedData.discountPercentage || null,
      additionalAmount: validatedData.additionalAmount || 0,
      additionalDiscount: validatedData.additionalDiscount || 0,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      isActive: true
    }).returning();

    // Emit real-time update to affiliate dashboard
    emitAffiliateLinkCreated(user.id, link[0]);

    res.json({
      message: 'Affiliate link created successfully',
      link: link[0]
    });

  } catch (error: any) {
    console.error('Create affiliate link error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get affiliate's links
router.get('/links', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const links = await db.select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.affiliateId, user.id))
      .orderBy(desc(affiliateLinks.createdAt));

    res.json(links);

  } catch (error) {
    console.error('Get affiliate links error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete affiliate link (Affiliate only - own links, Admin - any link)
router.delete('/links/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const linkId = parseInt(req.params.id);

    // Get the link to check ownership
    const link = await db.select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.id, linkId))
      .limit(1);

    if (link.length === 0) {
      return res.status(404).json({ error: 'Affiliate link not found' });
    }

    // Check if user owns this link or is admin
    const userIsAdmin = isAdmin(user.role as any);
    if (!userIsAdmin && link[0].affiliateId !== user.id) {
      return res.status(403).json({ error: 'You can only delete your own affiliate links' });
    }

    // Delete associated metrics first to avoid foreign key constraint violation
    const deletedMetrics = await db.delete(affiliateMetrics)
      .where(eq(affiliateMetrics.linkId, linkId))
      .returning();

    log.info(`Deleted ${deletedMetrics.length} associated metrics for link ${linkId}`);

    // Now delete the affiliate link
    const deleted = await db.delete(affiliateLinks)
      .where(eq(affiliateLinks.id, linkId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Affiliate link not found' });
    }

    res.json({
      message: 'Affiliate link deleted successfully',
      deletedLink: deleted[0],
      deletedMetricsCount: deletedMetrics.length
    });

  } catch (error) {
    console.error('Delete affiliate link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all affiliate links (Admin only)
router.get('/links/all', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const links = await db.select({
      id: affiliateLinks.id,
      affiliateId: affiliateLinks.affiliateId,
      linkCode: affiliateLinks.linkCode,
      linkUrl: affiliateLinks.linkUrl,
      priceAdjustment: affiliateLinks.priceAdjustment,
      adjustmentType: affiliateLinks.adjustmentType,
      discountPercentage: affiliateLinks.discountPercentage,
      additionalAmount: affiliateLinks.additionalAmount,
      additionalDiscount: affiliateLinks.additionalDiscount,
      isActive: affiliateLinks.isActive,
      clickCount: affiliateLinks.clickCount,
      conversionCount: affiliateLinks.conversionCount,
      createdAt: affiliateLinks.createdAt,
      // Join with users to get affiliate info
      affiliateEmail: users.email,
      affiliateFirstName: users.firstName,
      affiliateLastName: users.lastName
    })
    .from(affiliateLinks)
    .leftJoin(users, eq(affiliateLinks.affiliateId, users.id))
    .orderBy(desc(affiliateLinks.createdAt));

    res.json(links);

  } catch (error) {
    console.error('Get all affiliate links error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get affiliate metrics (NEW COMMISSION-BASED SYSTEM)
router.get('/metrics', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get traditional metrics
    const metrics = await db.select()
      .from(affiliateMetrics)
      .where(eq(affiliateMetrics.affiliateId, user.id))
      .orderBy(desc(affiliateMetrics.createdAt));

    // Get commission earnings from new system
    const earnings = await storage.getAffiliateEarningsByUser(user.id);

    // Calculate summary statistics
    const totalClicks = metrics.filter(m => m.eventType === 'click').length;
    const totalRegistrations = metrics.filter(m => m.eventType === 'registration').length;
    const totalBookings = metrics.filter(m => m.eventType === 'booking').length;
    const legacyEarnings = metrics.reduce((sum, m) => sum + (m.affiliateEarning || 0), 0);

    // Calculate earnings from new commission system
    const totalCommissionEarnings = earnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.commissionAmount, 0);
    const approvedEarnings = earnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.commissionAmount, 0);
    const withdrawnEarnings = earnings.filter(e => e.status === 'withdrawn').reduce((sum, e) => sum + e.commissionAmount, 0);

    res.json({
      metrics,
      earnings,
      summary: {
        totalClicks,
        totalRegistrations,
        totalBookings,
        totalEarnings: totalCommissionEarnings + legacyEarnings, // Combined earnings
        pendingEarnings,
        approvedEarnings,
        withdrawnEarnings,
        conversionRate: totalClicks > 0 ? (totalBookings / totalClicks * 100).toFixed(2) : '0.00'
      }
    });

  } catch (error) {
    console.error('Get affiliate metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate affiliate link (Affiliate only)
router.put('/links/:id/deactivate', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const linkId = parseInt(req.params.id);

    // Verify the link belongs to the current user
    const link = await storage.getAffiliateLinksByUser(user.id);
    const targetLink = link.find(l => l.id === linkId);

    if (!targetLink) {
      return res.status(404).json({ error: 'Link not found or access denied' });
    }

    const updatedLink = await storage.updateAffiliateLink(linkId, {
      isActive: false
    });

    if (!updatedLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ message: 'Link deactivated successfully', link: updatedLink });
  } catch (error) {
    console.error('Deactivate link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate affiliate link (Affiliate only)
router.put('/links/:id/activate', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const linkId = parseInt(req.params.id);

    // Verify the link belongs to the current user
    const link = await storage.getAffiliateLinksByUser(user.id);
    const targetLink = link.find(l => l.id === linkId);

    if (!targetLink) {
      return res.status(404).json({ error: 'Link not found or access denied' });
    }

    const updatedLink = await storage.updateAffiliateLink(linkId, {
      isActive: true
    });

    if (!updatedLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ message: 'Link activated successfully', link: updatedLink });
  } catch (error) {
    console.error('Activate link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Admin endpoints for commission management

// Get all affiliate earnings (Admin only)
router.get('/earnings', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const earnings = await storage.getAffiliateEarnings();

    // Get affiliate details for each earning
    const earningsWithDetails = await Promise.all(earnings.map(async (earning) => {
      const affiliate = await storage.getUser(earning.affiliateId);
      const customer = await storage.getUser(earning.userId);
      return {
        ...earning,
        affiliateName: affiliate ? `${affiliate.firstName} ${affiliate.lastName}` : 'Unknown',
        affiliateEmail: affiliate?.email,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
        customerEmail: customer?.email
      };
    }));

    res.json(earningsWithDetails);
  } catch (error) {
    console.error('Get affiliate earnings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve affiliate earnings (Admin only)
router.put('/earnings/:id/approve', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const earningId = parseInt(req.params.id);
    const { notes } = req.body;

    const updatedEarning = await storage.updateAffiliateEarning(earningId, {
      status: 'approved',
      approvedBy: user.id,
      approvedAt: new Date(),
      notes: notes || null
    });

    if (!updatedEarning) {
      return res.status(404).json({ error: 'Earning record not found' });
    }

    res.json({ message: 'Earning approved successfully', earning: updatedEarning });
  } catch (error) {
    console.error('Approve earning error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject affiliate earnings (Admin only)
router.put('/earnings/:id/reject', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const earningId = parseInt(req.params.id);
    const { notes } = req.body;

    const updatedEarning = await storage.updateAffiliateEarning(earningId, {
      status: 'rejected',
      approvedBy: user.id,
      approvedAt: new Date(),
      notes: notes || null
    });

    if (!updatedEarning) {
      return res.status(404).json({ error: 'Earning record not found' });
    }

    res.json({ message: 'Earning rejected successfully', earning: updatedEarning });
  } catch (error) {
    console.error('Reject earning error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get withdrawal batches (Admin only)
router.get('/withdrawals', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const withdrawals = await storage.getAffiliateWithdrawals();
    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create withdrawal batch (Admin only)
router.post('/withdrawals', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { withdrawalType, notes } = req.body;

    // Get all approved earnings that haven't been withdrawn
    const approvedEarnings = await storage.getAffiliateEarningsByStatus('approved');

    if (approvedEarnings.length === 0) {
      return res.status(400).json({ error: 'No approved earnings available for withdrawal' });
    }

    // Calculate total amount and affiliate count
    const totalAmount = approvedEarnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const uniqueAffiliates = new Set(approvedEarnings.map(e => e.affiliateId));
    const affiliateCount = uniqueAffiliates.size;

    // Generate batch name
    const now = new Date();
    const batchName = `${withdrawalType === 'weekly' ? 'Weekly' : 'Monthly'} Batch - ${now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} ${withdrawalType === 'weekly' ? `Week ${Math.ceil(now.getDate() / 7)}` : ''}`;

    // Create withdrawal batch
    const withdrawal = await storage.createAffiliateWithdrawal({
      batchName,
      withdrawalType: withdrawalType || 'weekly',
      totalAmount,
      affiliateCount,
      status: 'pending',
      notes: notes || null
    });

    // Update all approved earnings to reference this withdrawal
    await Promise.all(approvedEarnings.map(earning =>
      storage.updateAffiliateEarning(earning.id, {
        status: 'withdrawn',
        withdrawalId: withdrawal.id,
        withdrawalDate: new Date()
      })
    ));

    res.json({ message: 'Withdrawal batch created successfully', withdrawal });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process withdrawal batch (Admin only)
router.put('/withdrawals/:id/process', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const withdrawalId = parseInt(req.params.id);
    const { paymentMethod, paymentReference, notes } = req.body;

    const updatedWithdrawal = await storage.updateAffiliateWithdrawal(withdrawalId, {
      status: 'completed',
      processedBy: user.id,
      processedAt: new Date(),
      paymentMethod: paymentMethod || null,
      paymentReference: paymentReference || null,
      notes: notes || null
    });

    if (!updatedWithdrawal) {
      return res.status(404).json({ error: 'Withdrawal batch not found' });
    }

    res.json({ message: 'Withdrawal batch processed successfully', withdrawal: updatedWithdrawal });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin link control endpoints

// Admin: Activate/Deactivate any affiliate link
router.put('/admin/links/:id/toggle', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const linkId = parseInt(req.params.id);
    const { isActive } = req.body;

    const updatedLink = await storage.updateAffiliateLink(linkId, {
      isActive: isActive
    });

    if (!updatedLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({
      message: `Link ${isActive ? 'activated' : 'deactivated'} successfully`,
      link: updatedLink
    });
  } catch (error) {
    console.error('Admin toggle link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete any affiliate link
router.delete('/admin/links/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const linkId = parseInt(req.params.id);

    // First check if the link exists
    const link = await db.select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.id, linkId))
      .limit(1);

    if (link.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Delete associated metrics first to avoid foreign key constraint violation
    const deletedMetrics = await db.delete(affiliateMetrics)
      .where(eq(affiliateMetrics.linkId, linkId))
      .returning();

    log.info(`Deleted ${deletedMetrics.length} associated metrics for link ${linkId}`);

    // Now delete the affiliate link
    const deletedLinks = await db.delete(affiliateLinks)
      .where(eq(affiliateLinks.id, linkId))
      .returning();

    if (deletedLinks.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({
      message: 'Link deleted successfully',
      deletedLink: deletedLinks[0],
      deletedMetricsCount: deletedMetrics.length
    });
  } catch (error) {
    console.error('Admin delete link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get affiliate performance dashboard data
router.get('/admin/performance', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    // Get all affiliates (users with affiliate role)
    const allUsers = await storage.getUsers();
    const affiliates = allUsers.filter(user => user.role === 'affiliate');

    // Get all affiliate links
    const allLinks = await storage.getAllAffiliateLinks();

    // Get all affiliate metrics
    const allMetrics = await storage.getAffiliateMetrics();

    // Get all affiliate earnings
    const allEarnings = await storage.getAffiliateEarnings();

    // Build performance data for each affiliate
    const performanceData = await Promise.all(affiliates.map(async (affiliate) => {
      const affiliateLinks = allLinks.filter(link => link.affiliateId === affiliate.id);
      const affiliateMetrics = allMetrics.filter(metric => metric.affiliateId === affiliate.id);
      const affiliateEarnings = allEarnings.filter(earning => earning.affiliateId === affiliate.id);

      const totalClicks = affiliateMetrics.filter(m => m.eventType === 'click').length;
      const totalRegistrations = affiliateMetrics.filter(m => m.eventType === 'registration').length;
      const totalBookings = affiliateMetrics.filter(m => m.eventType === 'booking').length;
      const totalEarnings = affiliateEarnings.reduce((sum, e) => sum + e.commissionAmount, 0);
      const pendingEarnings = affiliateEarnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.commissionAmount, 0);
      const approvedEarnings = affiliateEarnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.commissionAmount, 0);

      return {
        affiliate: {
          id: affiliate.id,
          name: `${affiliate.firstName} ${affiliate.lastName}`,
          email: affiliate.email
        },
        links: affiliateLinks,
        metrics: {
          totalClicks,
          totalRegistrations,
          totalBookings,
          totalEarnings,
          pendingEarnings,
          approvedEarnings,
          conversionRate: totalClicks > 0 ? (totalBookings / totalClicks * 100).toFixed(2) : '0.00'
        }
      };
    }));

    res.json(performanceData);
  } catch (error) {
    console.error('Get admin performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== WITHDRAWAL REQUEST ROUTES =====

// Create withdrawal request (Affiliate only)
router.post('/withdrawal-requests', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = withdrawalRequestValidation.parse(req.body) as WithdrawalRequestData;

    // Check if affiliate has enough approved earnings
    const earnings = await storage.getAffiliateEarningsByUser(user.id);
    const approvedEarnings = earnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.commissionAmount, 0);

    if (validatedData.amount > approvedEarnings) {
      return res.status(400).json({
        error: 'Insufficient approved commission balance',
        availableBalance: approvedEarnings,
        requestedAmount: validatedData.amount
      });
    }

    // Create withdrawal request
    const withdrawalRequest = await storage.createAffiliateWithdrawalRequest({
      affiliateId: user.id,
      amount: validatedData.amount,
      accountNumber: validatedData.accountNumber,
      accountTitle: validatedData.accountTitle,
      bankName: validatedData.bankName,
      status: 'pending'
    });

    res.json({
      message: 'Withdrawal request submitted successfully',
      withdrawalRequest
    });

  } catch (error: any) {
    console.error('Create withdrawal request error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get affiliate's withdrawal requests
router.get('/withdrawal-requests', authenticateToken, requireRole('affiliate'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const withdrawalRequests = await storage.getAffiliateWithdrawalRequestsByUser(user.id);
    res.json(withdrawalRequests);

  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all withdrawal requests (Admin only)
router.get('/admin/withdrawal-requests', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const withdrawalRequests = await storage.getAffiliateWithdrawalRequests();

    // Get affiliate details for each request
    const requestsWithDetails = await Promise.all(withdrawalRequests.map(async (request) => {
      const affiliate = await storage.getUser(request.affiliateId);
      return {
        ...request,
        affiliateName: affiliate ? `${affiliate.firstName} ${affiliate.lastName}` : 'Unknown',
        affiliateEmail: affiliate?.email
      };
    }));

    res.json(requestsWithDetails);
  } catch (error) {
    console.error('Get admin withdrawal requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve withdrawal request (Admin only)
router.put('/admin/withdrawal-requests/:id/approve', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestId = parseInt(req.params.id);
    const { adminNotes } = req.body;

    const updatedRequest = await storage.updateAffiliateWithdrawalRequest(requestId, {
      status: 'approved',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      adminNotes: adminNotes || null
    });

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    res.json({ message: 'Withdrawal request approved successfully', withdrawalRequest: updatedRequest });
  } catch (error) {
    console.error('Approve withdrawal request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject withdrawal request (Admin only)
router.put('/admin/withdrawal-requests/:id/reject', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestId = parseInt(req.params.id);
    const { adminNotes } = req.body;

    const updatedRequest = await storage.updateAffiliateWithdrawalRequest(requestId, {
      status: 'rejected',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      adminNotes: adminNotes || 'Request rejected by admin'
    });

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    res.json({ message: 'Withdrawal request rejected successfully', withdrawalRequest: updatedRequest });
  } catch (error) {
    console.error('Reject withdrawal request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark withdrawal request as paid (Admin only)
router.put('/admin/withdrawal-requests/:id/mark-paid', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestId = parseInt(req.params.id);
    const { paymentMethod, paymentReference, adminNotes } = req.body;

    const updatedRequest = await storage.updateAffiliateWithdrawalRequest(requestId, {
      status: 'paid',
      paymentMethod: paymentMethod || null,
      paymentReference: paymentReference || null,
      paidAt: new Date(),
      adminNotes: adminNotes || null
    });

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    res.json({ message: 'Withdrawal request marked as paid successfully', withdrawalRequest: updatedRequest });
  } catch (error) {
    console.error('Mark withdrawal request as paid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update affiliate commission rate (Admin only)
router.put('/admin/commission-rate/:affiliateId', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const affiliateId = req.params.affiliateId;
    const { commissionRate } = req.body;

    // Validate commission rate
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ 
        error: 'Commission rate must be a number between 0 and 100' 
      });
    }

    // Check if the affiliate exists
    const affiliate = await db.select()
      .from(users)
      .where(and(eq(users.id, affiliateId), eq(users.role, 'affiliate')))
      .limit(1);

    if (affiliate.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    // Update the commission rate
    const updatedAffiliate = await db.update(users)
      .set({
        commissionRate: commissionRate,
        updatedAt: new Date()
      })
      .where(eq(users.id, affiliateId))
      .returning();

    if (updatedAffiliate.length === 0) {
      return res.status(404).json({ error: 'Failed to update commission rate' });
    }

    res.json({
      message: 'Commission rate updated successfully',
      affiliate: {
        id: updatedAffiliate[0].id,
        email: updatedAffiliate[0].email,
        firstName: updatedAffiliate[0].firstName,
        lastName: updatedAffiliate[0].lastName,
        commissionRate: updatedAffiliate[0].commissionRate
      }
    });

  } catch (error) {
    console.error('Update commission rate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
