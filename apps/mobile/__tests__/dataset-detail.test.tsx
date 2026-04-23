import { fireEvent, render } from '@testing-library/react-native';

import { DatasetDetailScreen } from '../src/screens/DatasetDetailScreen';

const mockUseDataset = jest.fn();
const mockUseStats = jest.fn();
const mockUseRecords = jest.fn();
const mockUseBookmarks = jest.fn();
const mockUseAddBookmark = jest.fn();
const mockUseRemoveBookmark = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ slug: 'healthcare_access' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('../src/api/hooks', () => ({
  useDataset: (slug: string) => mockUseDataset(slug),
  useStats: (slug: string) => mockUseStats(slug),
  useRecords: (slug: string, args: any) => mockUseRecords(slug, args),
  useBookmarks: () => mockUseBookmarks(),
  useAddBookmark: () => mockUseAddBookmark(),
  useRemoveBookmark: () => mockUseRemoveBookmark(),
}));

jest.mock('../src/lib/a11y', () => ({
  announceForAccessibility: async () => {},
  withA11yLabel: (p: any) => p,
}));

describe('DatasetDetailScreen', () => {
  beforeEach(() => {
    mockUseAddBookmark.mockReturnValue({ mutate: jest.fn() });
    mockUseRemoveBookmark.mockReturnValue({ mutate: jest.fn() });
    mockUseBookmarks.mockReturnValue({ data: { data: [] } });
  });

  it('loading -> success renders title, stats, chart summary, and records', () => {
    mockUseDataset.mockReturnValueOnce({ isLoading: true });
    mockUseStats.mockReturnValue({ isLoading: true });
    mockUseRecords.mockReturnValue({ isLoading: true, isRefetching: false });

    const { getByLabelText, getAllByLabelText, rerender, getByRole } = render(
      <DatasetDetailScreen slug="healthcare_access" />,
    );
    expect(getByLabelText('Loading state')).toBeTruthy();

    mockUseDataset.mockReturnValueOnce({
      isLoading: false,
      isError: false,
      data: {
        id: '1',
        slug: 'healthcare_access',
        category: 'healthcare',
        title: 'Healthcare access',
        description: 'desc',
        source_url: 'x',
        source_type: 'fixture',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    mockUseStats.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { count: 2, min: 1, max: 3, mean: 2 },
      refetch: jest.fn(),
    });
    mockUseRecords.mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: {
        data: [
          {
            id: 'r1',
            dataset_id: '1',
            payload: { title: 'Row 1', region: 'TX', value: 10, date: '2026-01-01' },
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'r2',
            dataset_id: '1',
            payload: { title: 'Row 2', region: 'TX', value: 5, date: '2026-02-01' },
            created_at: '2026-02-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 20,
        total: 2,
      },
      refetch: jest.fn(),
      isFetching: false,
    });

    rerender(<DatasetDetailScreen slug="healthcare_access" />);
    expect(getByRole('header', { name: 'Healthcare access' })).toBeTruthy();
    expect(getAllByLabelText(/Bar chart showing/i)[0]).toBeTruthy();
    expect(getByLabelText('Record Row 1')).toBeTruthy();
  });

  it('ChartWithTextAlt summary includes key phrases', () => {
    mockUseDataset.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: '1',
        slug: 'healthcare_access',
        category: 'healthcare',
        title: 'Healthcare access',
        description: 'desc',
        source_url: 'x',
        source_type: 'fixture',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    mockUseStats.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { count: 1, min: 1, max: 1, mean: 1 },
    });
    mockUseRecords.mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: {
        data: [
          {
            id: 'r1',
            dataset_id: '1',
            payload: { value: 10, date: '2026-01-01' },
            created_at: 'x',
          },
        ],
        page: 1,
        page_size: 20,
        total: 1,
      },
      refetch: jest.fn(),
      isFetching: false,
    });

    const { getAllByLabelText } = render(<DatasetDetailScreen slug="healthcare_access" />);
    const node = getAllByLabelText(/Bar chart/i)[0];
    expect(node.props.accessibilityLabel).toContain('Highest');
    expect(node.props.accessibilityLabel).toContain('Lowest');
  });

  it('Bookmark button toggles label between Save and Remove', () => {
    mockUseDataset.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: '1',
        slug: 'healthcare_access',
        category: 'healthcare',
        title: 'Healthcare access',
        description: 'desc',
        source_url: 'x',
        source_type: 'fixture',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });
    mockUseStats.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { count: 0, min: 0, max: 0, mean: 0 },
    });
    mockUseRecords.mockReturnValue({
      isLoading: false,
      isError: false,
      isRefetching: false,
      data: { data: [], page: 1, page_size: 20, total: 0 },
      refetch: jest.fn(),
      isFetching: false,
    });

    mockUseBookmarks.mockReturnValueOnce({ data: { data: [] } });
    const { getByLabelText, rerender } = render(<DatasetDetailScreen slug="healthcare_access" />);
    expect(getByLabelText('Save dataset')).toBeTruthy();

    mockUseBookmarks.mockReturnValueOnce({ data: { data: [{ slug: 'healthcare_access' }] } });
    rerender(<DatasetDetailScreen slug="healthcare_access" />);
    expect(getByLabelText('Remove bookmark')).toBeTruthy();
  });
});
