import { v4 as uuidv4 } from 'uuid';
import type { RawItem } from '../domain/types';

export const seedItems: RawItem[] = [
  {
    id: uuidv4(),
    createdAt: new Date(Date.now() - 100000).toISOString(),
    assetType: 'image',
    entryPoint: 'demo_seed',
    fileName: 'hologram_ui_ref.png',
    processingStatus: 'queued',
  },
  {
    id: uuidv4(),
    createdAt: new Date(Date.now() - 50000).toISOString(),
    assetType: 'text',
    entryPoint: 'demo_seed',
    textContent: '투명한 인터페이스와 프라이버시가 결합된 로컬 에이전트. 데이터를 외부로 보내지 않아야 해.',
    processingStatus: 'queued',
  },
  {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    assetType: 'image',
    entryPoint: 'demo_seed',
    fileName: 'brain_constellation_concept.png',
    processingStatus: 'queued',
  }
];