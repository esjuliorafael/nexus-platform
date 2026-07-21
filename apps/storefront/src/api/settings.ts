import client from './client';
import { GroupedSettings, Media } from '../types';

export const settingsApi = {
  getStoreSettings: () => client.get<GroupedSettings>('/store/settings').then(res => res.data),
  getRaffleSettings: () => client.get<GroupedSettings>('/store/settings').then(res => res.data),
  getPublicShippingZones: () => client.get<any[]>('/admin/shipping-zones/public').then(res => res.data),
};

export const mediaApi = {
  getAll: () => client.get<Media[]>('/store/media').then(res => res.data),
};
