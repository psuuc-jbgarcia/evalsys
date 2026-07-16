import api from './api';

export const waitForJob = async <T,>(jobId: string): Promise<T> => {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const status = await api.get(`/jobs/${jobId}`);
    if (status.data.status === 'failed') {
      throw new Error(status.data.error || 'Background job failed');
    }
    if (status.data.status === 'completed') {
      const completed = await api.get<{ result?: T }>(`/jobs/${jobId}/result`);
      return completed.data.result as T;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }

  throw new Error('The operation is still running. Please try again shortly.');
};
