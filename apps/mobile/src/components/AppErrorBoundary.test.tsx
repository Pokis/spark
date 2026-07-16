import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { reportError } from '../services/diagnostics';
import { AppErrorBoundary } from './AppErrorBoundary';

jest.mock('../services/diagnostics', () => ({
  reportError: jest.fn()
}));

describe('AppErrorBoundary', () => {
  it('renders children while the tree is healthy', async () => {
    const view = await render(
      <AppErrorBoundary>
        <Text>Healthy content</Text>
      </AppErrorBoundary>
    );
    expect(view.getByText('Healthy content')).toBeTruthy();
  });

  it('shows a recovery message and records a privacy-safe diagnostic', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const error = new Error('render failed');
    const Broken = () => {
      throw error;
    };

    const view = await render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>
    );

    expect(view.getByText('Spark hit a rough edge.')).toBeTruthy();
    expect(
      view.getByRole('button', { name: 'Try Spark again' })
    ).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith('react.error_boundary', error);
    consoleError.mockRestore();
  });
});
