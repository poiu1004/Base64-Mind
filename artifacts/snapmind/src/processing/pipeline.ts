import { rawItemRepo, blobRepo, cardRepo, nodeRepo, edgeRepo, profileRepo, feedbackRepo } from '../db/repositories';
import { extractSignals } from './extractors';
import { buildCards } from './cardBuilder';
import { buildGraph } from './graphBuilder';
import { recomputeAgentProfile } from '../domain/formation';

export async function processRawItem(itemId: string): Promise<void> {
  const item = await rawItemRepo.getById(itemId);
  if (!item) return;

  try {
    await rawItemRepo.updateStatus(itemId, "processing");
    
    let blob: Blob | undefined;
    if (item.blobId) {
      blob = await blobRepo.getById(item.blobId);
    }
    
    const signals = extractSignals(item, blob);
    // Note: skipping signalRepo.create for MVP speed, using directly
    
    const existingCards = await cardRepo.getAll();
    const newCards = buildCards(signals, existingCards);
    for (const card of newCards) {
      await cardRepo.upsert(card);
    }
    
    const existingNodes = await nodeRepo.getAll();
    const existingEdges = await edgeRepo.getAll();
    
    const allCards = await cardRepo.getAll(); // Get updated state
    const { nodes, edges } = buildGraph(allCards, existingNodes, existingEdges);
    
    for (const node of nodes) {
      await nodeRepo.upsert(node);
    }
    for (const edge of edges) {
      await edgeRepo.upsert(edge);
    }
    
    const items = await rawItemRepo.getAll();
    const feedback = await feedbackRepo.getAll();
    
    const profile = recomputeAgentProfile(items, allCards, nodes, edges, feedback);
    await profileRepo.upsert(profile);
    
    await rawItemRepo.updateStatus(itemId, "processed");
  } catch (error) {
    console.error("Processing failed for item", itemId, error);
    await rawItemRepo.updateStatus(itemId, "failed");
  }
}