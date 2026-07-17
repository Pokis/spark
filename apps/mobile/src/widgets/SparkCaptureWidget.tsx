'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function SparkCaptureWidget() {
  return (
    <FlexWidget
      accessibilityLabel="Quick capture. Tap to park a thought in Spark."
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'spark://quick-capture' }}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 22,
        backgroundColor: '#0B1020',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      <TextWidget text="✦" style={{ color: '#8367E8', fontSize: 25, marginRight: 10 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text="QUICK CAPTURE"
          style={{ color: '#A8B0C4', fontSize: 11, fontWeight: '700' }}
        />
        <TextWidget
          text="Save a thought"
          style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}
        />
      </FlexWidget>
      <TextWidget text="＋" style={{ color: '#FFFFFF', fontSize: 24 }} />
    </FlexWidget>
  );
}
