import { fireEvent, render } from '@testing-library/react-native';

import SavedScreen from '../app/(tabs)/saved';

const mockPush = jest.fn();
const mockMutateAsync = jest.fn(async () => {});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../src/api/hooks', () => ({
  useBookmarks: jest.fn(),
  useRemoveBookmark: jest.fn(),
}));

const hooks = require('../src/api/hooks') as {
  useBookmarks: jest.Mock;
  useRemoveBookmark: jest.Mock;
};

describe('Saved screen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockMutateAsync.mockClear();
  });

  it('shows empty state', () => {
    hooks.useBookmarks.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    hooks.useRemoveBookmark.mockReturnValue({ mutateAsync: mockMutateAsync });

    const { getByLabelText } = render(<SavedScreen />);
    expect(getByLabelText(/No saved datasets yet/i)).toBeTruthy();
  });

  it('renders bookmarks and remove fires mutation', () => {
    hooks.useBookmarks.mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            slug: 'healthcare_access',
            category: 'Health',
            title: 'Healthcare access',
            description: 'desc',
            source_url: 'https://example.com',
            source_type: 'fixture',
            updated_at: new Date().toISOString(),
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    hooks.useRemoveBookmark.mockReturnValue({ mutateAsync: mockMutateAsync });

    const { getByLabelText, getByText } = render(<SavedScreen />);

    fireEvent.press(getByLabelText('Dataset Healthcare access'));
    expect(mockPush).toHaveBeenCalledWith('/dataset/healthcare_access');

    fireEvent.press(getByText('Remove bookmark'));
    expect(mockMutateAsync).toHaveBeenCalledWith({ slug: 'healthcare_access' });
  });
});
