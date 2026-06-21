const fs = require('fs');
const path = require('path');

console.log('�� Cleaning up unused files for auth testing...');
console.log('===============================================\n');

// Files to move to backup
const filesToBackup = [
  'src/common/entities/aircraft.entity.ts',
  'src/common/entities/booking.entity.ts', 
  'src/common/entities/company.entity.ts',
  'src/modules/users/users.module.ts',
  'src/modules/companies/companies.module.ts',
  'src/modules/aircraft/aircraft.module.ts',
  'src/modules/bookings/bookings.module.ts',
  'src/modules/payments/payments.module.ts',
  'src/modules/pilots/pilots.module.ts',
  'src/modules/admin/admin.module.ts',
  'src/modules/notifications/notifications.module.ts',
  'src/modules/email/email.module.ts',
  'src/modules/file-upload/file-upload.module.ts'
];

// Create backup directory
const backupDir = 'src/backup';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('✅ Created backup directory');
}

// Move files to backup
filesToBackup.forEach(file => {
  const sourcePath = path.join(process.cwd(), file);
  const backupPath = path.join(process.cwd(), backupDir, path.basename(file));
  
  if (fs.existsSync(sourcePath)) {
    fs.renameSync(sourcePath, backupPath);
    console.log(`✅ Moved ${file} to backup`);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Run: npm run start:dev');
console.log('2. Test auth endpoints');
console.log('3. Create missing entities one by one as needed');
console.log('');
console.log('📁 Backup files are in: src/backup/');
console.log('🔄 To restore: move files back from backup directory');
