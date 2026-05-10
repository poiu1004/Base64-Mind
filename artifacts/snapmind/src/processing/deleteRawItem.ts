import { rawItemRepo, blobRepo, signalRepo, cardRepo, nodeRepo, edgeRepo, profileRepo, feedbackRepo } from '../db/repositories';
import { recomputeGraph } from './graphBuilder';
import { recomputeAgentProfile } from '../domain/formation';

export async function deleteRawItemAndRecompute(itemId: string): Promise<void> {
  const item = await rawItemRepo.getById(itemId);
  if (!item) return;

  await signalRepo.removeByItemId(itemId);
  await cardRepo.removeBySourceItem(itemId);
  
  if (item.blobId) {
    await blobRepo.remove(item.blobId);
  }
  await rawItemRepo.remove(itemId);
  
  const remainingCards = await cardRepo.getAll();
  const existingNodes = await nodeRepo.getAll();
  const existingEdges = await edgeRepo.getAll();
  
  const { nodes, edges } = recomputeGraph(remainingCards, existingNodes, existingEdges);
  
  // Very naive sync for MVP: delete all, then put all
  // In production, we'd only delete orphans and update survivors
  const currentNodes = await nodeRepo.getAll();
  for (const n of currentNodes) await nodeRepo.remove(n.id);
  for (const n of nodes) await nodeRepo.upsert(n);
  
  const currentEdges = await edgeRepo.getAll();
  for (const e of currentEdges) await edgeRepo.remove(e.id);
  for (const e of edges) await edgeRepo.upsert(e);
  
  const items = await rawItemRepo.getAll();
  const feedback = await feedbackRepo.getAll();
  const profile = recomputeAgentProfile(items, remainingCards, nodes, edges, feedback);
  await profileRepo.upsert(profile);
}