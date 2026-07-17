import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('keeps a useful summary visible and reveals content on demand', async () => {
    const view = await render(
      <CollapsibleSection title="Reminders" summary="Local invitations and quiet hours">
        <Text>Reminder controls</Text>
      </CollapsibleSection>
    );

    expect(view.getByText('Local invitations and quiet hours')).toBeTruthy();
    expect(view.queryByText('Reminder controls')).toBeNull();
    const expand = view.getByRole('button', { name: 'Expand Reminders' });
    expect(expand.props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(expand);
    expect(view.getByText('Reminder controls')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Collapse Reminders' }));
    expect(view.queryByText('Reminder controls')).toBeNull();
  });

  it('supports a parent-controlled section that can always be opened and closed', async () => {
    function ControlledSection() {
      const [expanded, setExpanded] = useState(false);
      return (
        <CollapsibleSection
          title="Today suggestions"
          summary="Energy, time, and place"
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <Text>Suggestion controls</Text>
        </CollapsibleSection>
      );
    }

    const view = await render(<ControlledSection />);
    expect(view.getByText('Show')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Expand Today suggestions' }));
    expect(view.getByText('Suggestion controls')).toBeTruthy();
    expect(view.getByText('Hide')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Collapse Today suggestions' }));
    expect(view.queryByText('Suggestion controls')).toBeNull();
  });
});
