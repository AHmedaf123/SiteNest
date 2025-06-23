import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function setSocketIO(socketInstance: SocketIOServer) {
  io = socketInstance;
}

export function emitUserRegistered(user: any) {
  if (io) {
    io.to('admin-dashboard').emit('user-registered', {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      },
      timestamp: new Date()
    });
  }
}

export function emitUserRoleChanged(userId: string, oldRole: string, newRole: string) {
  if (io) {
    io.to('admin-dashboard').emit('user-role-changed', {
      userId,
      oldRole,
      newRole,
      timestamp: new Date()
    });
  }
}

export function emitAffiliateApplicationSubmitted(application: any) {
  if (io) {
    io.to('admin-dashboard').emit('affiliate-application-submitted', {
      application,
      timestamp: new Date()
    });
  }
}

export function emitAffiliateApplicationReviewed(application: any) {
  if (io) {
    io.to('admin-dashboard').emit('affiliate-application-reviewed', {
      application,
      timestamp: new Date()
    });
    
    // Also notify the specific affiliate
    io.to(`affiliate-${application.userId}`).emit('application-status-updated', {
      status: application.status,
      reviewNotes: application.reviewNotes,
      timestamp: new Date()
    });
  }
}

export function emitAffiliateLinkCreated(affiliateId: string, link: any) {
  if (io) {
    io.to(`affiliate-${affiliateId}`).emit('affiliate-link-created', {
      link,
      timestamp: new Date()
    });
  }
}

export function emitAffiliateLinkClicked(affiliateId: string, linkId: number) {
  if (io) {
    io.to(`affiliate-${affiliateId}`).emit('affiliate-link-clicked', {
      linkId,
      timestamp: new Date()
    });
  }
}

export function emitAffiliateEarning(affiliateId: string, earning: any) {
  if (io) {
    io.to(`affiliate-${affiliateId}`).emit('affiliate-earning', {
      earning,
      timestamp: new Date()
    });
  }
}

export function emitBookingRequestCreated(bookingRequest: any) {
  if (io) {
    io.to('admin-dashboard').emit('new-booking-request', {
      bookingRequest,
      timestamp: new Date()
    });
  }
}

export function emitBookingRequestUpdated(bookingRequest: any) {
  if (io) {
    io.to('admin-dashboard').emit('booking-request-updated', {
      bookingRequest,
      timestamp: new Date()
    });
  }
}

export function emitDashboardStatsUpdate(stats: any) {
  if (io) {
    io.to('admin-dashboard').emit('dashboard-stats-update', {
      stats,
      timestamp: new Date()
    });
  }
}
