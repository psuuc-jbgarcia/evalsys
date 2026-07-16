const crypto = require('crypto');

const jobs = new Map();
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 30 * 60 * 1000);
const MAX_JOBS = Number(process.env.JOB_MAX_ENTRIES || 50);

const pruneJobs = () => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.expiresAt <= now) jobs.delete(id);
  }
  while (jobs.size >= MAX_JOBS) {
    const oldestId = jobs.keys().next().value;
    if (!oldestId) break;
    jobs.delete(oldestId);
  }
};

const createJob = ({ type, ownerId, task }) => {
  pruneJobs();
  const id = crypto.randomUUID();
  const job = {
    id,
    type,
    ownerId: ownerId?.toString(),
    status: 'queued',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: Date.now() + JOB_TTL_MS,
    result: null,
    error: null,
  };
  jobs.set(id, job);

  setImmediate(async () => {
    job.status = 'running';
    job.updatedAt = new Date();
    try {
      job.result = await task();
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = error?.message || 'Background job failed';
    }
    job.updatedAt = new Date();
    job.expiresAt = Date.now() + JOB_TTL_MS;
  });

  return job;
};

const getJob = (id, ownerId) => {
  pruneJobs();
  const job = jobs.get(id);
  if (!job || job.ownerId !== ownerId?.toString()) return null;
  return job;
};

const serializeJob = (job, includeResult = false) => ({
  id: job.id,
  type: job.type,
  status: job.status,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  error: job.error,
  ...(includeResult && job.status === 'completed' ? { result: job.result } : {}),
});

module.exports = { createJob, getJob, serializeJob };
