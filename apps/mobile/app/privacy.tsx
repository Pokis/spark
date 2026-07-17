import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, SectionHeading } from '../src/components/Typography';

export default function PrivacyScreen() {
  return (
    <Screen>
      <Eyebrow>Plain-language privacy</Eyebrow>
      <H1>Your data stays private.</H1>
      <Card>
        <SectionHeading>Always kept on this device</SectionHeading>
        <Body>
          Habit names and history, energy check-ins, routines, focus sessions, and captured
          text are stored in an encrypted database inside Spark on this device.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Sent only when you turn on online features</SectionHeading>
        <Body>
          If you turn on online support or check Premium, Spark sends a random account ID,
          messages you type, your Spark version and phone type, and the purchase receipt needed
          to check payment.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Never sent by Spark</SectionHeading>
        <Body>
          Your habit content, completion calendar, focus titles, energy check-ins, routines, and captured
          thoughts are not included in support, purchase verification, or admin tools.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Calendar and sharing happen only when you choose</SectionHeading>
        <Body>
          Spark can open your calendar app with one focus or leave-on-time block already filled
          in. It does not read your calendar. Progress sharing includes only the wins you select
          and opens your phone’s Share menu. Spark never sends an automatic progress report.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Backups can be locked</SectionHeading>
        <Body>
          A manual or automatic-folder backup can be locked with a password or recovery code.
          Android writes automatic backups only to a folder you choose. Spark cannot recover a
          forgotten backup password for you.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Optional app lock and private previews</SectionHeading>
        <Body>
          Spark can require device authentication after backgrounding. Sensitive-preview
          protection is optional; on Android it also blocks screenshots while enabled.
          Notification lock-screen visibility can show habit details, generic wording, or hide
          the reminder.
        </Body>
      </Card>
      <Card>
        <SectionHeading>You can delete optional online data</SectionHeading>
        <Body>
          Settings can remove support conversations, online access, and Spark’s random online
          account ID. Records that must be retained for purchase or security reasons are no
          longer connected to that ID. Data stored on your phone is unchanged.
        </Body>
      </Card>
      <Card>
        <SectionHeading>Important health note</SectionHeading>
        <Body>
          Spark is a self-management and organization tool. It does not diagnose, treat, cure, or
          prevent ADHD or any medical condition, and it is not a substitute for professional care.
        </Body>
      </Card>
    </Screen>
  );
}
