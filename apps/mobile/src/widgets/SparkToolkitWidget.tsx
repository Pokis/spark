'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

const toolStyle = {
  flex: 1,
  height: 54,
  borderRadius: 14,
  backgroundColor: '#171D2E' as `#${string}`,
  paddingHorizontal: 10,
  alignItems: 'center' as const,
  justifyContent: 'center' as const
};

export function SparkToolkitWidget() {
  return (
    <FlexWidget
      accessibilityLabel="Spark shortcuts for capture, focus, departure, and help."
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 22,
        backgroundColor: '#0B1020',
        padding: 12,
        flexDirection: 'column'
      }}
    >
      <TextWidget text="✦  SPARK TOOLKIT" style={{ color: '#A8B0C4', fontSize: 11, fontWeight: '700', marginBottom: 8 }} />
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row' }}>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'spark://quick-capture' }} style={{ ...toolStyle, marginRight: 6 }}>
          <TextWidget text="＋  Capture" style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} />
        </FlexWidget>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'spark://focus-launch?minutes=2' }} style={{ ...toolStyle, marginLeft: 6 }}>
          <TextWidget text="▶  Focus" style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', marginTop: 8 }}>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'spark://departure' }} style={{ ...toolStyle, marginRight: 6 }}>
          <TextWidget text="↗  Departure" style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} />
        </FlexWidget>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'spark://help' }} style={{ ...toolStyle, marginLeft: 6 }}>
          <TextWidget text="♡  Help now" style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
