import { rawItemRepo } from '../db/repositories';
import { processRawItem } from '../processing/pipeline';
import { seedItems } from './seedItems';
import { useSnapMindStore } from '../state/useSnapMindStore';

export async function runDemoScenario() {
  const store = useSnapMindStore.getState();
  store.setIsProcessing(true);
  
  for (const item of seedItems) {
    await rawItemRepo.create(item);
    await processRawItem(item.id);
  }
  
  await store.refreshFromDb();
  store.setIsProcessing(false);
}