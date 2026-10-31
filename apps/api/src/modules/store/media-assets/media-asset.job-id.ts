export function createMediaProcessingJobId(assetId: string, revision: string) {
  return `${assetId}-${revision}`;
}
