
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db utility
const mockSelect = vi.fn();
vi.mock('../../../server/utils/db', () => ({
  db: {
    select: mockSelect,
  },
}));

describe('Podcast API', () => {
  let handler: any;
  let db: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock globals
    vi.stubGlobal('defineCachedEventHandler', (handler: any) => handler);
    vi.stubGlobal('getPaginationParams', () => ({ limit: 10, offset: 0 }));
    vi.stubGlobal('getQuery', () => ({}));
    vi.stubGlobal('createPaginatedResponse', (data: any, total: any) => ({ data, total }));

    // Import db to set up the mock on the imported object if needed,
    // though the mock above should handle the import in the SUT.
    const dbModule = await import('../../../server/utils/db');
    db = dbModule.db;

    // Stub the global db if the code uses auto-imported db
    vi.stubGlobal('db', db);

    const handlerModule = await import('../../../server/api/podcasts/index.get');
    handler = handlerModule.default;
  });

  it('fetches podcasts and count', async () => {
    // Mock the chainable db methods
    const mockFrom = vi.fn();
    const mockWhere = vi.fn();
    const mockLimit = vi.fn();
    const mockOffset = vi.fn();
    const mockOrderBy = vi.fn();

    // Setup the mock chain
    mockSelect.mockImplementation(() => ({
      from: mockFrom,
    }));

    mockFrom.mockReturnValue({ where: mockWhere });

    // Mock for count query
    mockWhere.mockReturnValueOnce([{ value: 10 }]);

    // Mock for data query
    mockWhere.mockReturnValueOnce({
      limit: mockLimit
    });
    mockLimit.mockReturnValue({
        offset: mockOffset
    });
    mockOffset.mockReturnValue({
        orderBy: mockOrderBy
    });

    const mockData = [{ id: 1, title: 'Test Podcast' }];
    mockOrderBy.mockResolvedValue(mockData);

    const event = {} as any;
    const result = await handler(event);

    expect(db.select).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: mockData, total: 10 });
  });
});
