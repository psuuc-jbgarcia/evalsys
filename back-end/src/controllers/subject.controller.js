const { migrateDefaultSubject } = require('../services/defaultSubjectMigration');

exports.migrateDefaultSubject = async (_req, res) => {
  try {
    const result = await migrateDefaultSubject();
    res.json({
      message: 'Default subject migration complete.',
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Default subject migration failed.',
      error: err.message,
    });
  }
};
