export function shouldRecordSearch(consent: boolean, ready: boolean, hasCriteria: boolean, previous: string | null, signature: string) {
  return consent && ready && hasCriteria && previous !== signature;
}