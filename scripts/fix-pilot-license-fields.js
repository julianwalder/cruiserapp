const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/PilotLicenseUpload.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the field mappings from camelCase to snake_case
const fieldMappings = {
  'existingLicense.placeOfBirth': 'existingLicense.place_of_birth',
  'existingLicense.stateOfIssue': 'existingLicense.state_of_issue',
  'existingLicense.issuingAuthority': 'existingLicense.issuing_authority',
  'existingLicense.licenseNumber': 'existingLicense.license_number',
  'existingLicense.licenseType': 'existingLicense.license_type',
  'existingLicense.dateOfInitialIssue': 'existingLicense.date_of_initial_issue',
  'existingLicense.countryCodeOfInitialIssue': 'existingLicense.country_code_of_initial_issue',
  'existingLicense.dateOfIssue': 'existingLicense.date_of_issue',
  'existingLicense.issuingOfficerName': 'existingLicense.issuing_officer_name',
  'existingLicense.classTypeRatings': 'existingLicense.class_type_ratings',
  'existingLicense.irValidUntil': 'existingLicense.ir_valid_until',
  'existingLicense.languageProficiency': 'existingLicense.language_proficiency',
  'existingLicense.medicalClassRequired': 'existingLicense.medical_class_required',
  'existingLicense.medicalCertificateExpiry': 'existingLicense.medical_certificate_expiry',
  'existingLicense.radiotelephonyLanguages': 'existingLicense.radiotelephony_languages',
  'existingLicense.radiotelephonyRemarks': 'existingLicense.radiotelephony_remarks',
  'existingLicense.holderSignaturePresent': 'existingLicense.holder_signature_present',
  'existingLicense.examinerSignatures': 'existingLicense.examiner_signatures',
  'existingLicense.icaoCompliant': 'existingLicense.icao_compliant',
  'existingLicense.abbreviationsReference': 'existingLicense.abbreviations_reference',
};

// Apply the replacements
Object.entries(fieldMappings).forEach(([oldField, newField]) => {
  const regex = new RegExp(oldField.replace(/\./g, '\\.'), 'g');
  content = content.replace(regex, newField);
});

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed field names in PilotLicenseUpload.tsx');
console.log('📝 Applied the following mappings:');
Object.entries(fieldMappings).forEach(([oldField, newField]) => {
  console.log(`   ${oldField} → ${newField}`);
});
