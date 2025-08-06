#!/usr/bin/env node

/**
 * Populate Existing Veriff Data Script
 * 
 * This script fetches all existing verifications from Veriff and populates
 * the database with comprehensive verification data.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;
const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

if (!VERIFF_API_KEY || !VERIFF_API_SECRET) {
  console.error('❌ Missing Veriff API credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class VeriffDataPopulator {
  constructor() {
    this.stats = {
      total: 0,
      processed: 0,
      updated: 0,
      errors: 0,
      skipped: 0
    };
  }

  generateSignature(payloadString) {
    const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  async fetchVerifications(limit = 100, offset = 0) {
    try {
      const response = await fetch(`${VERIFF_BASE_URL}/verifications?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
        },
      });

      if (!response.ok) {
        throw new Error(`Veriff API returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching verifications:', error);
      throw error;
    }
  }

  async fetchVerificationDetails(verificationId) {
    try {
      const response = await fetch(`${VERIFF_BASE_URL}/verifications/${verificationId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Verification ${verificationId} not found (404)`);
          return null;
        }
        throw new Error(`Veriff API returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching verification ${verificationId}:`, error);
      return null;
    }
  }

  async findUserByVerificationId(verificationId) {
    try {
      // First try to find by session ID
      const { data: user, error } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('veriffSessionId', verificationId)
        .single();

      if (user) {
        return user;
      }

      // If not found, try to find by verification ID
      const { data: user2, error: error2 } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('veriffVerificationId', verificationId)
        .single();

      if (user2) {
        return user2;
      }

      return null;
    } catch (error) {
      console.error('Error finding user by verification ID:', error);
      return null;
    }
  }

  async findUserByEmail(email) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('email', email)
        .single();

      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async updateUserVerificationData(userId, verificationData) {
    try {
      const updateData = {
        veriffWebhookData: verificationData,
        veriffWebhookReceivedAt: new Date().toISOString(),
        veriffVerificationId: verificationData.id,
        veriffSessionId: verificationData.id,
        veriffStatus: verificationData.status,
        veriffUpdatedAt: new Date().toISOString(),
      };

      // Extract person data
      if (verificationData.person) {
        updateData.veriffPersonGivenName = verificationData.person.givenName;
        updateData.veriffPersonLastName = verificationData.person.lastName;
        updateData.veriffPersonIdNumber = verificationData.person.idNumber;
        updateData.veriffPersonDateOfBirth = verificationData.person.dateOfBirth ? new Date(verificationData.person.dateOfBirth) : null;
        updateData.veriffPersonNationality = verificationData.person.nationality;
        updateData.veriffPersonGender = verificationData.person.gender;
        updateData.veriffPersonCountry = verificationData.person.country;
      }

      // Extract document data
      if (verificationData.document) {
        updateData.veriffDocumentType = verificationData.document.type;
        updateData.veriffDocumentNumber = verificationData.document.number;
        updateData.veriffDocumentCountry = verificationData.document.country;
        updateData.veriffDocumentValidFrom = verificationData.document.validFrom ? new Date(verificationData.document.validFrom) : null;
        updateData.veriffDocumentValidUntil = verificationData.document.validUntil ? new Date(verificationData.document.validUntil) : null;
        updateData.veriffDocumentIssuedBy = verificationData.document.issuedBy;
      }

      // Extract face verification data
      if (verificationData.additionalVerification?.faceMatch) {
        updateData.veriffFaceMatchSimilarity = verificationData.additionalVerification.faceMatch.similarity;
        updateData.veriffFaceMatchStatus = verificationData.additionalVerification.faceMatch.status;
      }

      // Extract decision and insights
      if (verificationData.decisionScore !== undefined) {
        updateData.veriffDecisionScore = verificationData.decisionScore;
      }
      if (verificationData.insights) {
        updateData.veriffQualityScore = verificationData.insights.quality;
        updateData.veriffFlags = verificationData.insights.flags;
        updateData.veriffContext = verificationData.insights.context;
      }

      // Set verification status
      if (verificationData.status === 'approved') {
        updateData.identityVerified = true;
        updateData.veriffApprovedAt = verificationData.updatedAt || new Date().toISOString();
      } else if (verificationData.status === 'declined') {
        updateData.identityVerified = false;
        updateData.veriffDeclinedAt = verificationData.updatedAt || new Date().toISOString();
      } else if (verificationData.status === 'submitted') {
        updateData.veriffSubmittedAt = verificationData.updatedAt || new Date().toISOString();
      }

      // Set timestamps
      if (verificationData.createdAt) {
        updateData.veriffCreatedAt = new Date(verificationData.createdAt);
      }
      if (verificationData.updatedAt) {
        updateData.veriffUpdatedAt = new Date(verificationData.updatedAt);
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error(`Error updating user ${userId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error updating user verification data for ${userId}:`, error);
      return false;
    }
  }

  async processVerification(verification) {
    try {
      this.stats.total++;
      
      console.log(`Processing verification ${verification.id} (${verification.status})...`);

      // Fetch detailed verification data
      const detailedVerification = await this.fetchVerificationDetails(verification.id);
      if (!detailedVerification) {
        this.stats.skipped++;
        console.log(`Skipped verification ${verification.id} (not found or error)`);
        return;
      }

      // Try to find the user
      let user = await this.findUserByVerificationId(verification.id);
      
      if (!user && detailedVerification.person?.email) {
        user = await this.findUserByEmail(detailedVerification.person.email);
      }

      if (!user) {
        this.stats.skipped++;
        console.log(`Skipped verification ${verification.id} (no matching user found)`);
        return;
      }

      // Update user with verification data
      const success = await this.updateUserVerificationData(user.id, detailedVerification);
      
      if (success) {
        this.stats.updated++;
        console.log(`✅ Updated user ${user.firstName} ${user.lastName} (${user.email}) with verification data`);
      } else {
        this.stats.errors++;
        console.log(`❌ Failed to update user ${user.firstName} ${user.lastName}`);
      }

      this.stats.processed++;
    } catch (error) {
      this.stats.errors++;
      console.error(`Error processing verification ${verification.id}:`, error);
    }
  }

  async populateAllVerifications() {
    console.log('🚀 Starting Veriff data population...\n');

    let offset = 0;
    const limit = 50; // Process in batches
    let hasMore = true;

    while (hasMore) {
      try {
        console.log(`📥 Fetching verifications (offset: ${offset}, limit: ${limit})...`);
        
        const verifications = await this.fetchVerifications(limit, offset);
        
        if (!verifications || verifications.length === 0) {
          console.log('No more verifications to process');
          hasMore = false;
          break;
        }

        console.log(`Found ${verifications.length} verifications`);

        // Process each verification
        for (const verification of verifications) {
          await this.processVerification(verification);
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        offset += limit;
        
        // If we got fewer results than the limit, we've reached the end
        if (verifications.length < limit) {
          hasMore = false;
        }

      } catch (error) {
        console.error('Error fetching verifications batch:', error);
        hasMore = false;
      }
    }

    console.log('\n📊 Population completed!');
    console.log('Statistics:');
    console.log(`  Total verifications found: ${this.stats.total}`);
    console.log(`  Processed: ${this.stats.processed}`);
    console.log(`  Updated users: ${this.stats.updated}`);
    console.log(`  Errors: ${this.stats.errors}`);
    console.log(`  Skipped: ${this.stats.skipped}`);
  }
}

async function main() {
  console.log('🔧 Veriff Data Population Tool');
  console.log('==============================\n');

  const populator = new VeriffDataPopulator();
  
  try {
    await populator.populateAllVerifications();
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  }
}

// Run the population
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 