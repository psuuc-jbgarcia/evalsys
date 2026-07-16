const { createJob, serializeJob } = require('../services/job.service');

const executeController = (handler, req) => new Promise((resolve, reject) => {
  let statusCode = 200;
  const backgroundResponse = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      if (statusCode >= 400) {
        const error = new Error(body?.message || `Background request failed with status ${statusCode}`);
        error.statusCode = statusCode;
        return reject(error);
      }
      return resolve(body);
    },
  };

  Promise.resolve(handler(req, backgroundResponse)).catch(reject);
});

const backgroundJob = (type, handler) => (req, res, next) => {
  if (req.query.background !== 'true') {
    return Promise.resolve(handler(req, res, next)).catch(next);
  }

  const job = createJob({
    type,
    ownerId: req.user._id,
    task: () => executeController(handler, req),
  });

  return res.status(202).json({
    message: 'Background job queued',
    job: serializeJob(job),
  });
};


module.exports = { backgroundJob };
