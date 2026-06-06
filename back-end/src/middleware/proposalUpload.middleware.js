const path = require('path');
const multer = require('multer');

const MAX_PROPOSAL_SIZE = 10 * 1024 * 1024;
const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROPOSAL_SIZE },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Upload a PDF, DOC, DOCX, PPT, or PPTX file only'));
    }
    cb(null, true);
  },
}).single('proposalFile');

const proposalUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Proposal file must be 10 MB or smaller' });
    }
    return res.status(400).json({ message: err.message || 'Invalid proposal file upload' });
  });
};

module.exports = proposalUpload;
