import { db } from './db';
import { affiliateLinks, affiliateMetrics, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

// Utility functions for admin operations

export async function listAllAffiliateLinks() {
  try {
    console.log('📋 Fetching all affiliate links...');
    
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

    console.log(`\n🔗 Found ${links.length} affiliate links:\n`);
    
    if (links.length === 0) {
      console.log('   No affiliate links found.');
      return [];
    }

    links.forEach((link, index) => {
      console.log(`${index + 1}. Link ID: ${link.id}`);
      console.log(`   Code: ${link.linkCode}`);
      console.log(`   URL: ${link.linkUrl}`);
      console.log(`   Affiliate: ${link.affiliateFirstName} ${link.affiliateLastName} (${link.affiliateEmail})`);
      console.log(`   Active: ${link.isActive ? '✅' : '❌'}`);
      console.log(`   Clicks: ${link.clickCount}, Conversions: ${link.conversionCount}`);
      
      if (link.additionalAmount || link.additionalDiscount) {
        console.log(`   Pricing: +${link.additionalAmount || 0} PKR, -${link.additionalDiscount || 0}%`);
      } else if (link.priceAdjustment) {
        console.log(`   Legacy Pricing: ${link.adjustmentType} ${link.priceAdjustment} PKR`);
      }
      
      console.log(`   Created: ${new Date(link.createdAt).toLocaleDateString()}`);
      console.log('');
    });

    return links;
  } catch (error) {
    console.error('❌ Error fetching affiliate links:', error);
    return [];
  }
}

export async function deleteAffiliateLink(linkId: number) {
  try {
    console.log(`🗑️ Deleting affiliate link with ID: ${linkId}...`);
    
    // First, get the link details
    const link = await db.select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.id, linkId))
      .limit(1);

    if (link.length === 0) {
      console.log('❌ Affiliate link not found.');
      return false;
    }

    console.log(`   Link Code: ${link[0].linkCode}`);
    console.log(`   Link URL: ${link[0].linkUrl}`);

    // Delete associated metrics first (to maintain referential integrity)
    const deletedMetrics = await db.delete(affiliateMetrics)
      .where(eq(affiliateMetrics.linkId, linkId))
      .returning();

    if (deletedMetrics.length > 0) {
      console.log(`   🗑️ Deleted ${deletedMetrics.length} associated metrics`);
    }

    // Delete the affiliate link
    const deleted = await db.delete(affiliateLinks)
      .where(eq(affiliateLinks.id, linkId))
      .returning();

    if (deleted.length > 0) {
      console.log('✅ Affiliate link deleted successfully!');
      return true;
    } else {
      console.log('❌ Failed to delete affiliate link.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting affiliate link:', error);
    return false;
  }
}

export async function deleteAllAffiliateLinks() {
  try {
    console.log('🗑️ Deleting ALL affiliate links...');
    
    // Get all links first
    const links = await listAllAffiliateLinks();
    
    if (links.length === 0) {
      console.log('✅ No affiliate links to delete.');
      return true;
    }

    console.log(`⚠️ About to delete ${links.length} affiliate links. This action cannot be undone.`);
    
    // Delete all metrics first
    const deletedMetrics = await db.delete(affiliateMetrics).returning();
    console.log(`   🗑️ Deleted ${deletedMetrics.length} affiliate metrics`);

    // Delete all affiliate links
    const deletedLinks = await db.delete(affiliateLinks).returning();
    console.log(`   🗑️ Deleted ${deletedLinks.length} affiliate links`);

    console.log('✅ All affiliate links deleted successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error deleting all affiliate links:', error);
    return false;
  }
}

export async function deactivateAffiliateLink(linkId: number) {
  try {
    console.log(`⏸️ Deactivating affiliate link with ID: ${linkId}...`);
    
    const updated = await db.update(affiliateLinks)
      .set({ isActive: false })
      .where(eq(affiliateLinks.id, linkId))
      .returning();

    if (updated.length > 0) {
      console.log('✅ Affiliate link deactivated successfully!');
      return true;
    } else {
      console.log('❌ Affiliate link not found.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error deactivating affiliate link:', error);
    return false;
  }
}

// Main function for command line usage
export async function runAdminCommand(command: string, ...args: string[]) {
  console.log(`🔧 Running admin command: ${command}\n`);
  
  switch (command) {
    case 'list':
      await listAllAffiliateLinks();
      break;
      
    case 'delete':
      if (args[0]) {
        const linkId = parseInt(args[0]);
        if (isNaN(linkId)) {
          console.log('❌ Invalid link ID. Please provide a valid number.');
        } else {
          await deleteAffiliateLink(linkId);
        }
      } else {
        console.log('❌ Please provide a link ID to delete.');
        console.log('Usage: npm run admin delete <linkId>');
      }
      break;
      
    case 'delete-all':
      await deleteAllAffiliateLinks();
      break;
      
    case 'deactivate':
      if (args[0]) {
        const linkId = parseInt(args[0]);
        if (isNaN(linkId)) {
          console.log('❌ Invalid link ID. Please provide a valid number.');
        } else {
          await deactivateAffiliateLink(linkId);
        }
      } else {
        console.log('❌ Please provide a link ID to deactivate.');
        console.log('Usage: npm run admin deactivate <linkId>');
      }
      break;
      
    default:
      console.log('❌ Unknown command. Available commands:');
      console.log('  list          - List all affiliate links');
      console.log('  delete <id>   - Delete specific affiliate link');
      console.log('  delete-all    - Delete all affiliate links');
      console.log('  deactivate <id> - Deactivate specific affiliate link');
  }
}

// If this file is run directly
if (require.main === module) {
  const [,, command, ...args] = process.argv;

  if (!command) {
    console.error('Please provide a command.');
    console.info('Usage: tsx server/admin-utils.ts <command> [args]');
    console.info('\nAvailable commands:');
    console.info('  list          - List all affiliate links');
    console.info('  delete <id>   - Delete specific affiliate link');
    console.info('  delete-all    - Delete all affiliate links');
    console.info('  deactivate <id> - Deactivate specific affiliate link');
    process.exit(1);
  }

  runAdminCommand(command, ...args)
    .then(() => {
      console.info('Admin command completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin command failed', error);
      process.exit(1);
    });
}
