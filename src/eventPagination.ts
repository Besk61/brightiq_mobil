export const EVENT_PAGE_SIZE = 30;

// The extra matching event locates the next page without needing a total-count API.
export async function fetchEventPage<T>(
  fetchBatch: (offset: number, limit: number) => Promise<T[]>,
  matches: (event: T) => boolean,
  startOffset = 0,
  signal?: AbortSignal
): Promise<{ events: T[]; nextOffset: number | null }> {
  const events: T[] = [];
  let offset = startOffset;
  while (true) {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    const batch = await fetchBatch(offset, EVENT_PAGE_SIZE + 1);
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    for (let index = 0; index < batch.length; index++) {
      if (!matches(batch[index])) continue;
      if (events.length === EVENT_PAGE_SIZE) {
        return { events, nextOffset: offset + index };
      }
      events.push(batch[index]);
    }
    if (batch.length < EVENT_PAGE_SIZE + 1) {
      return { events, nextOffset: null };
    }
    offset += batch.length;
  }
}
