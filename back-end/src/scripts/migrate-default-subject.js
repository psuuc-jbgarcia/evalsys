require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { migrateDefaultSubject } = require('../services/defaultSubjectMigration');

const run = async () => {
  await connectDB();
  const result = await migrateDefaultSubject();

  console.log('Default subject migration complete.');
  console.log(`Subject: ${result.subject.code} - ${result.subject.title}`);
  console.log(`Sections updated: ${result.sectionsUpdated}`);
  console.log(`Rubrics updated: ${result.rubricsUpdated}`);
  console.log(`Admins assigned: ${result.adminsAssigned}`);
  console.log(`Default superadmin: ${result.defaultSuperadmin.email}`);
  if (result.defaultInstructor) console.log(`Default instructor: ${result.defaultInstructor.email}`);
  console.log(`Evaluations updated: ${result.evaluationsUpdated}`);
  console.log(`Evaluations defaulted to ${result.subject.code}: ${result.evaluationsDefaulted}`);
};

run()
  .catch((err) => {
    console.error('Default subject migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
