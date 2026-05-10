import { rawItemRepo, blobRepo, cardRepo, nodeRepo, edgeRepo, profileRepo, feedbackRepo, signalRepo } from '../db/repositories';
import { extractSignals } from './extractors';
import { buildCards } from './cardBuilder';
import { buildGraph } from './graphBuilder';
import { recomputeAgentProfile } from '../domain/formation';

export async function processRawItem(itemId: string): Promise<void> {
  const item = await rawItemRepo.getById(itemId);
  if (!item) return;

  try {
    await rawItemRepo.updateStatus(itemId, 'processing');

    // Load blob for image/file types
    let blob: Blob | undefined;
    if (item.blobId) {
      blob = await blobRepo.getById(item.blobId);
    }

    // Extract signals — async now (image canvas analysis)
    const signals = await extractSignals(item, blob);

    // Persist signals so they can be re-queried later
    const existingSignals = await signalRepo.getByItemId(itemId);
    if (existingSignals.length === 0) {
      for (const sig of signals) {
        await signalRepo.create(sig);
      }
    }

    // Build / merge cards
    const existingCards = await cardRepo.getAll();
    const updatedCards = buildCards(signals, existingCards);
    for (const card of updatedCards) {
      await cardRepo.upsert(card);
    }

    // Build / merge graph
    const existingNodes = await nodeRepo.getAll();
    const existingEdges = await edgeRepo.getAll();
    const allCards = await cardRepo.getAll();

    const { nodes, edges } = buildGraph(allCards, existingNodes, existingEdges);

    for (const node of nodes) {
      await nodeRepo.upsert(node);
    }
    for (const edge of edges) {
      await edgeRepo.upsert(edge);
    }

    // Recompute profile
    const items = await rawItemRepo.getAll();
    const feedback = await feedbackRepo.getAll();
    const profile = recomputeAgentProfile(items, allCards, nodes, edges, feedback);
    await profileRepo.upsert(profile);

    await rawItemRepo.updateStatus(itemId, 'processed');
  } catch (error) {
    console.error('Processing failed for item', itemId, error);
    await rawItemRepo.updateStatus(itemId, 'failed');
  }
}
