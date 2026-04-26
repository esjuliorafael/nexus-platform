import client from './client';
import { GroupedSettings, Media } from '../types';

export const settingsApi = {
  getStoreSettings: () => client.get<GroupedSettings>('/admin/settings').then(res => res.data),
  getRaffleSettings: () => client.get<GroupedSettings>('/raffle/settings').then(res => res.data),
};

export const mediaApi = {
  getAll: () => client.get<Media[]>('/admin/media').then(res => res.data),
};
