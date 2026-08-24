/**
 * Delivery is deliberately behind an interface. The thesis needs the dispatcher to be
 * testable without an email provider, and production needs to swap one in without the
 * dispatcher knowing.
 */
export type NotificationKind = 'enquiry_received' | 'enquiry_alert';

export interface Notification {
  id: string;
  kind: NotificationKind;
  recipient: string;
  locale: 'bg' | 'en';
  payload: Record<string, unknown>;
}

export interface Transport {
  send(notification: Notification): Promise<void>;
}

const SUBJECTS: Record<NotificationKind, Record<'bg' | 'en', string>> = {
  enquiry_received: {
    bg: 'Получихме вашето запитване',
    en: 'We have received your enquiry',
  },
  enquiry_alert: {
    bg: 'Ново запитване',
    en: 'New enquiry',
  },
};

export function subjectFor(notification: Notification): string {
  return SUBJECTS[notification.kind][notification.locale];
}

export const consoleTransport: Transport = {
  async send(notification) {
    console.log(
      `[notify] ${notification.kind} -> ${notification.recipient}: ${subjectFor(notification)}`,
      notification.payload
    );
  },
};

/** Keeps what it was given, so tests can assert on delivery instead of mocking it. */
export function recordingTransport(): Transport & { sent: Notification[] } {
  const sent: Notification[] = [];
  return {
    sent,
    async send(notification) {
      sent.push(notification);
    },
  };
}
