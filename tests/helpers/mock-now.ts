/**
 * Freeze `new Date()` to a fixed instant while leaving Date.UTC, Date.parse,
 * and `new Date(...)` with arguments on the real Date implementation.
 */
export function mockNow(iso: string, originalDate: DateConstructor): Date {
  const mockDate = new originalDate(iso);
  jest.spyOn(global, 'Date').mockImplementation(function MockedDate(this: Date, ...args: unknown[]) {
    if (args.length === 0) {
      return mockDate;
    }
    return new (originalDate as any)(...args);
  } as any);
  const mocked = global.Date as DateConstructor;
  mocked.UTC = originalDate.UTC.bind(originalDate);
  mocked.parse = originalDate.parse.bind(originalDate);
  mocked.now = (): number => mockDate.getTime();
  return mockDate;
}
