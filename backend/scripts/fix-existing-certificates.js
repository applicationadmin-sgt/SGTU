/**
 * Migration Script: Fix Existing Certificates
 * 
 * This script updates all existing certificates to:
 * 1. Generate certificate numbers if missing
 * 2. Create verification hashes if missing
 * 3. Generate QR codes if missing
 * 4. Set verification URLs if missing
 * 5. Assign block numbers for chain integrity
 */

const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Generate certificate number
const generateCertificateNumber = (blockNumber) => {
  const year = new Date().getFullYear();
  return `SGTLMS-${year}-${String(blockNumber).padStart(6, '0')}`;
};

// Generate verification hash
const generateVerificationHash = (certificate, previousHash = null) => {
  const hashData = {
    certificateNumber: certificate.certificateNumber,
    student: certificate.student?._id ? certificate.student._id.toString() : certificate.student?.toString() || certificate.student,
    course: certificate.course?._id ? certificate.course._id.toString() : certificate.course?.toString() || certificate.course,
    issueDate: certificate.issueDate || certificate.createdAt,
    marksPercentage: certificate.marksPercentage || 0,
    blockNumber: certificate.blockNumber || 1
  };

  if (previousHash) {
    hashData.previousHash = previousHash;
  }

  const hashString = JSON.stringify(hashData);
  return crypto
    .createHash('sha256')
    .update(hashString)
    .digest('hex');
};

// Main migration function
const fixExistingCertificates = async () => {
  try {
    console.log('\n🔧 Starting certificate fix migration...\n');

    // Get all certificates sorted by creation date
    const certificates = await Certificate.find({})
      .sort({ createdAt: 1 })
      .lean();

    console.log(`📊 Found ${certificates.length} certificates to process\n`);

    if (certificates.length === 0) {
      console.log('ℹ️  No certificates found. Nothing to fix.');
      return;
    }

    let fixed = 0;
    let skipped = 0;
    let failed = 0;
    let previousHash = null;

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      const updates = {};
      let needsUpdate = false;

      console.log(`\n📝 Processing certificate ${i + 1}/${certificates.length}`);
      console.log(`   ID: ${cert._id}`);

      // 1. Generate certificate number if missing
      if (!cert.certificateNumber) {
        const blockNumber = i + 1;
        updates.certificateNumber = generateCertificateNumber(blockNumber);
        updates.blockNumber = blockNumber;
        needsUpdate = true;
        console.log(`   ✓ Generated certificate number: ${updates.certificateNumber}`);
      } else {
        console.log(`   ℹ️  Certificate number exists: ${cert.certificateNumber}`);
      }

      // 2. Set block number if missing
      if (!cert.blockNumber) {
        updates.blockNumber = i + 1;
        needsUpdate = true;
        console.log(`   ✓ Set block number: ${updates.blockNumber}`);
      }

      // 3. Set issue date if missing
      if (!cert.issueDate) {
        updates.issueDate = cert.createdAt || new Date();
        needsUpdate = true;
        console.log(`   ✓ Set issue date: ${updates.issueDate}`);
      }

      // 4. Generate verification hash if missing
      if (!cert.verificationHash) {
        // Create a temporary object with updated values
        const tempCert = {
          ...cert,
          ...updates
        };
        
        updates.previousHash = previousHash;
        updates.verificationHash = generateVerificationHash(tempCert, previousHash);
        needsUpdate = true;
        console.log(`   ✓ Generated verification hash: ${updates.verificationHash.substring(0, 20)}...`);
      } else {
        console.log(`   ℹ️  Verification hash exists`);
      }

      // 5. Generate verification URL if missing
      if (!cert.verificationUrl) {
        const hash = updates.verificationHash || cert.verificationHash;
        updates.verificationUrl = `https://192.168.7.20:3000/verify-certificate/${hash}`;
        needsUpdate = true;
        console.log(`   ✓ Generated verification URL`);
      } else {
        console.log(`   ℹ️  Verification URL exists`);
      }

      // 6. Generate QR code if missing
      if (!cert.qrCodeData) {
        try {
          const url = updates.verificationUrl || cert.verificationUrl;
          if (url) {
            const qrCodeDataURL = await QRCode.toDataURL(url, {
              errorCorrectionLevel: 'H',
              type: 'image/png',
              width: 200,
              margin: 2
            });
            updates.qrCodeData = qrCodeDataURL;
            needsUpdate = true;
            console.log(`   ✓ Generated QR code`);
          }
        } catch (qrError) {
          console.log(`   ⚠️  QR code generation failed: ${qrError.message}`);
        }
      } else {
        console.log(`   ℹ️  QR code exists`);
      }

      // 7. Update public verification data if missing
      if (!cert.publicVerificationData || !cert.publicVerificationData.certificateNumber) {
        const certWithUpdates = await Certificate.findById(cert._id)
          .populate('student', 'name')
          .populate('course', 'title');

        updates.publicVerificationData = {
          studentName: certWithUpdates.student?.name || 'N/A',
          courseName: certWithUpdates.course?.title || 'N/A',
          issueDate: updates.issueDate || cert.issueDate || cert.createdAt,
          certificateNumber: updates.certificateNumber || cert.certificateNumber,
          marksPercentage: cert.marksPercentage
        };
        needsUpdate = true;
        console.log(`   ✓ Updated public verification data`);
      }

      // Apply updates if needed
      if (needsUpdate) {
        try {
          await Certificate.findByIdAndUpdate(cert._id, updates, { new: true });
          fixed++;
          console.log(`   ✅ Certificate updated successfully`);
          
          // Store hash for next certificate's chain
          previousHash = updates.verificationHash || cert.verificationHash;
        } catch (updateError) {
          failed++;
          console.log(`   ❌ Update failed: ${updateError.message}`);
        }
      } else {
        skipped++;
        console.log(`   ⏭️  Certificate already complete - skipped`);
        previousHash = cert.verificationHash;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total certificates: ${certificates.length}`);
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`⏭️  Skipped (already complete): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(60) + '\n');

    if (fixed > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('💡 All certificates now have:');
      console.log('   - Certificate numbers (SGTLMS-YYYY-XXXXXX)');
      console.log('   - Verification hashes (SHA-256)');
      console.log('   - QR codes');
      console.log('   - Verification URLs');
      console.log('   - Block numbers for chain integrity');
      console.log('   - Public verification data\n');
    }

  } catch (error) {
    console.error('\n❌ Migration error:', error);
    throw error;
  }
};

// Run the migration
const run = async () => {
  try {
    await connectDB();
    await fixExistingCertificates();
    console.log('\n✅ Migration completed. Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  run();
}

module.exports = { fixExistingCertificates };
