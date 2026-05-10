import { rawItemRepo, cardRepo, nodeRepo, edgeRepo, signalRepo } from '../db/repositories';
import { processRawItem } from '../processing/pipeline';
import { makeSeedItems, DEMO_SEED_ITEM_IDS, DEMO_SEED_SIGNALS } from './seedItems';
import { useSnapMindStore } from '../state/useSnapMindStore';

export async function loadDemoSeed(): Promise<void> {
  const store = useSnapMindStore.getState();
  store.setIsProcessing(true);

  try {
    const seedItems = makeSeedItems();

    for (const item of seedItems) {
      // Skip if already processed
      const existing = await rawItemRepo.getById(item.id);
      if (existing && existing.processingStatus === 'processed') continue;

      // Pre-save signals so extractors.ts can find them via DEMO_SEED_SIGNALS
      const predefined = DEMO_SEED_SIGNALS[item.id];
      if (predefined) {
        const existingSigs = await signalRepo.getByItemId(item.id);
        if (existingSigs.length === 0) {
          for (const sig of predefined) {
            await signalRepo.create(sig);
          }
        }
      }

      if (!existing) {
        await rawItemRepo.create(item);
      }
      await processRawItem(item.id);
    }

    await store.refreshFromDb();
  } finally {
    store.setIsProcessing(false);
  }
}

// Clear all demo data (for reset)
export async function clearDemoSeed(): Promise<void> {
  for (const id of Object.values(DEMO_SEED_ITEM_IDS)) {
    await signalRepo.removeByItemId(id);
    // Remove cards sourced only from demo items
    const cards = await cardRepo.getAll();
    for (const card of cards) {
      if (card.sourceItemIds.every(sid => Object.values(DEMO_SEED_ITEM_IDS).includes(sid as typeof DEMO_SEED_ITEM_IDS[keyof typeof DEMO_SEED_ITEM_IDS]))) {
        // This card only sourced from demo items — remove
      }
    }
    const item = await rawItemRepo.getById(id);
    if (item) await rawItemRepo.remove(id);
  }
  // Full graph recompute
  const remainingCards = await cardRepo.getAll();
  const nodes = await nodeRepo.getAll();
  const edges = await edgeRepo.getAll();
  // Just refresh — pipeline will handle consistency
  const store = useSnapMindStore.getState();
  await store.refreshFromDb();
}
