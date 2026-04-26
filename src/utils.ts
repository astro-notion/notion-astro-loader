/**
 * Sequentially aggregates items from an async iterable into an array.
 *
 * @param iterable - The async iterable to consume
 * @returns A promise that resolves to an array containing all items from the iterable
 * @typeParam T - The type of items in the iterable
 */
export async function awaitAll<T>(iterable: AsyncIterable<T>) {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}
