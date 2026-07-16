const { getJob, serializeJob } = require('../services/job.service');

exports.getJobStatus = (req, res) => {
  const job = getJob(req.params.id, req.user._id);
  if (!job) return res.status(404).json({ message: 'Background job not found or expired' });
  return res.json(serializeJob(job));
};

exports.getJobResult = (req, res) => {
  const job = getJob(req.params.id, req.user._id);
  if (!job) return res.status(404).json({ message: 'Background job not found or expired' });
  if (job.status === 'failed') return res.status(500).json({ message: job.error || 'Background job failed' });
  if (job.status !== 'completed') return res.status(409).json({ message: 'Background job is not complete', status: job.status });
  return res.json(serializeJob(job, true));
};
