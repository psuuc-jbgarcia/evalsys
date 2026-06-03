export type NotifyType = 'info' | 'success' | 'error';

export interface NotifyPayload {
  message: string;
  title?: string;
  type?: NotifyType;
}

export const notify = (message: string, options: Omit<NotifyPayload, 'message'> = {}) => {
  window.dispatchEvent(new CustomEvent<NotifyPayload>('evalsys:notify', {
    detail: {
      message,
      ...options,
    },
  }));
};
