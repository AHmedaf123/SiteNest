/**
 * Script to check existing affiliate links in the database
 */

import { db } from '../db';
import { affiliateLinks, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkAffiliateLinks() {
  try {
    console.log('🔍 Checking affiliate links in database...');
    
    // Get all affiliate links with user info
    const links = await db.select({
      id: affiliateLinks.id,
      affiliateId: affiliateLinks.affiliateId,
      linkCode: affiliateLinks.linkCode,
      linkUrl: affiliateLinks.linkUrl,
      isActive: affiliateLinks.isActive,
      clickCount: affiliateLinks.clickCount,
      conversionCount: affiliateLinks.conversionCount,
      createdAt: affiliateLinks.createdAt,
      // User info
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName
    })
    .from(affiliateLinks)
    .leftJoin(users, eq(affiliateLinks.affiliateId, users.id));
    
    console.log(`📊 Found ${links.length} affiliate links:`);
    
    if (links.length === 0) {
      console.log('❌ No affiliate links found in database');
      console.log('💡 You need to create an affiliate account and generate links first');
    } else {
      links.forEach((link, index) => {
        console.log(`\n${index + 1}. Link ID: ${link.id}`);
        console.log(`   Code: ${link.linkCode}`);
        console.log(`   URL: ${link.linkUrl}`);
        console.log(`   Active: ${link.isActive ? '✅' : '❌'}`);
        console.log(`   Clicks: ${link.clickCount}`);
        console.log(`   Conversions: ${link.conversionCount}`);
        console.log(`   Affiliate: ${link.userFirstName} ${link.userLastName} (${link.userEmail})`);
        console.log(`   Created: ${link.createdAt}`);
        
        // Show test URLs
        console.log(`   🔗 Test URLs:`);
        console.log(`      Direct: http://localhost:5000/api/track/affiliate/${link.linkCode}`);
        console.log(`      Fallback: http://localhost:5000/?ref=${link.linkCode}`);
      });
    }
    
    console.log('\n✨ Check complete!');
    
  } catch (error) {
    console.error('❌ Error checking affiliate links:', error);
    process.exit(1);
  }
}

// Run the check
checkAffiliateLinks().then(() => {
  process.exit(0);
});
