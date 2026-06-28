import client from './client';
import { StoreHero, StoreHeroScope } from '../types';

export const storeHeroApi = {
  getAll: (scope?: StoreHeroScope) =>
    client
      .get<StoreHero[]>('/store/store-heroes', { params: scope ? { scope } : undefined })
      .then((res) => res.data),
};
