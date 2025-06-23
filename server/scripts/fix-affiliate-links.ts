/**
 * Script to fix existing affiliate links to use the correct tracking URL format
 * Run this once to update all existing affiliate links in the database
 */

import { db } from '../db';
import { affiliateLinks } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixAffiliateLinks() {
  try {
    console.log('🔧 Starting affiliate links fix...');
    
    // Get all affiliate links
    const links = await db.select().from(affiliateLinks);
    console.log(`📊 Found ${links.length} affiliate links to check`);
    
    let updatedCount = 0;
    
    for (const link of links) {
      // Check if link uses old format (contains ?ref=)
      if (link.linkUrl.includes('?ref=')) {
        // Extract the base URL and link code
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const newLinkUrl = `${baseUrl}/api/track/affiliate/${link.linkCode}`;
        
        // Update the link
        await db.update(affiliateLinks)
          .set({ 
            linkUrl: newLinkUrl,
            updatedAt: new Date()
          })
          .where(eq(affiliateLinks.id, link.id));
        
        console.log(`✅ Updated link ${link.id}: ${link.linkUrl} → ${newLinkUrl}`);
        updatedCount++;
      }
    }
    
    console.log(`🎉 Fixed ${updatedCount} affiliate links`);
    console.log('✨ All affiliate links now use the correct tracking format!');
    
  } catch (error) {
    console.error('❌ Error fixing affiliate links:', error);
    process.exit(1);
  }
}

// Auto-run the fix script
fixAffiliateLinks()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

export { fixAffiliateLinks };
