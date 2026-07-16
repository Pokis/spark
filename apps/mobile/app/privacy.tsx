import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';

export default function PrivacyScreen() {
  return (
    <Screen>
      <Eyebrow>Plain-language privacy</Eyebrow>
      <H1>Your inner life is not inventory.</H1>
      <Card>
        <SectionHeading>Always kept on this device</SectionHeading>
        <Body>
          Habit names and history, capacity check-ins, routines, focus sessions, and brain-dump
          text are stored in Spark’s encrypted local SQLite database.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Sent only when you choose cloud features</SectionHeading>
        <Body>
          A random account identifier, support messages you deliberately send, basic app and
          platform version, and Play purchase tokens used for verification.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Never sent by Spark</SectionHeading>
        <Body>
          Your habit content, completion calendar, focus titles, capacity, routines, and captured
          thoughts are not included in support, purchase verification, or admin tools.
        </Body>
      </Card>
      <Card>
        <SectionHeading>You can delete the optional cloud identity</SectionHeading>
        <Body>
          Settings can remove support conversations, cloud access, and the random Firebase
          identity. Purchase or security records that must be retained are disconnected from that
          identity with a random deletion pseudonym. Local data is unchanged.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Health disclaimer</SectionHeading>
        <Body>
          Spark is a self-management and organization tool. It does not diagnose, treat, cure, or
          prevent ADHD or any medical condition, and it is not a substitute for professional care.
        </Body>
      </Card>
      <Muted>
        The publishable privacy policy is included with the project so it can be hosted at a
        stable public URL before Play Store release.
      </Muted>
    </Screen>
  );
}
