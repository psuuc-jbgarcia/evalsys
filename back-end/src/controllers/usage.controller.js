const mongoose = require('mongoose');

const bytesToMb = (bytes = 0) => Math.round((bytes / 1024 / 1024) * 100) / 100;

const getMongoUsage = async () => {
  const stats = await mongoose.connection.db.stats();
  const storageBytes = stats.storageSize || 0;
  const dataBytes = stats.dataSize || 0;
  const indexBytes = stats.indexSize || 0;
  const totalBytes = dataBytes + indexBytes;
  const atlasFreeLimitBytes = 512 * 1024 * 1024;

  return {
    database: stats.db,
    collections: stats.collections,
    objects: stats.objects,
    dataSizeMb: bytesToMb(dataBytes),
    storageSizeMb: bytesToMb(storageBytes),
    indexSizeMb: bytesToMb(indexBytes),
    estimatedTotalMb: bytesToMb(totalBytes),
    freeTierLimitMb: bytesToMb(atlasFreeLimitBytes),
    estimatedUsagePercent: Math.round((totalBytes / atlasFreeLimitBytes) * 10000) / 100,
  };
};

const getRenderUsage = async () => {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;

  if (!apiKey || !serviceId) {
    return {
      configured: false,
      message: 'Set RENDER_API_KEY and RENDER_SERVICE_ID to show Render service status.',
    };
  }

  try {
    const response = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return {
        configured: true,
        error: `Render API returned ${response.status}`,
      };
    }

    const service = await response.json();
    return {
      configured: true,
      serviceId,
      name: service?.service?.name || service?.name || 'Render service',
      type: service?.service?.type || service?.type || '',
      plan: service?.service?.serviceDetails?.plan || service?.serviceDetails?.plan || '',
      status: service?.service?.serviceDetails?.status || service?.serviceDetails?.status || '',
      note: 'Render free-tier hour quota is account-level. The Render API service endpoint shows service status, not a guaranteed monthly hour balance.',
    };
  } catch (err) {
    return {
      configured: true,
      error: err.message,
    };
  }
};

exports.getPlatformUsage = async (_req, res) => {
  const [mongo, render] = await Promise.all([
    getMongoUsage(),
    getRenderUsage(),
  ]);

  res.json({
    mongo,
    render,
    checkedAt: new Date().toISOString(),
  });
};
