import type { Locale } from './routes';

const bg = {
  'site.tagline': 'DJ и пълно парти обслужване за вашето събитие',
  'nav.home': 'Начало',
  'nav.services': 'Услуги',
  'nav.gallery': 'Галерия',
  'nav.music': 'Музика',
  'nav.pricing': 'Цени',
  'nav.availability': 'Свободни дати',
  'nav.about': 'За нас',
  'nav.testimonials': 'Отзиви',
  'nav.faq': 'Въпроси',
  'nav.blog': 'Блог',
  'nav.contact': 'Контакти',
  'nav.menu': 'Меню',
  'nav.close': 'Затвори',
  'nav.skipToContent': 'Към основното съдържание',

  'cta.book': 'Запитване за дата',
  'cta.checkDate': 'Провери свободна дата',
  'cta.call': 'Обади се',
  'cta.viber': 'Viber',
  'cta.whatsapp': 'WhatsApp',
  'cta.seeMore': 'Виж повече',
  'cta.seeAll': 'Виж всички',
  'cta.listen': 'Пусни',

  'lang.switch': 'English',
  'lang.label': 'Език',

  'pricing.from': 'от',
  'pricing.onRequest': 'По запитване',
  'pricing.note':
    'Цените са ориентировъчни и зависят от датата, локацията и продължителността.',

  'availability.title': 'Свободни дати',
  'availability.free': 'Свободно',
  'availability.busy': 'Заето',
  'availability.past': 'Отминала дата',
  'availability.disclaimer':
    'Календарът е ориентировъчен. Моля, потвърдете датата със запитване.',
  'availability.unavailable':
    'Календарът временно не е достъпен. Свържете се с нас и ще проверим датата веднага.',
  'availability.loading': 'Зареждане на календара…',

  'form.title': 'Запитване',
  'form.name': 'Име',
  'form.phone': 'Телефон',
  'form.email': 'Имейл',
  'form.date': 'Дата на събитието',
  'form.eventType': 'Вид събитие',
  'form.city': 'Град / локация',
  'form.guests': 'Брой гости',
  'form.message': 'Съобщение',
  'form.consent':
    'Съгласен/на съм личните ми данни да бъдат обработени с цел отговор на запитването.',
  'form.submit': 'Изпрати запитване',
  'form.sending': 'Изпращане…',
  'form.success': 'Благодарим! Ще се свържем с вас до 24 часа.',
  'form.error': 'Нещо се обърка. Опитайте отново или ни се обадете.',
  'form.required': 'Задължително поле',
  'form.optional': 'по избор',
  'form.dateTaken': 'Тази дата изглежда заета — пишете ни за алтернативи.',

  'footer.rights': 'Всички права запазени.',
  'footer.privacy': 'Политика за поверителност',
  'footer.terms': 'Общи условия',

  'a11y.playMix': 'Пусни микса',
  'a11y.openImage': 'Отвори снимката',
  'a11y.previous': 'Предишна',
  'a11y.next': 'Следваща',
} as const;

type UIKey = keyof typeof bg;

const en: Record<UIKey, string> = {
  'site.tagline': 'DJ and full party service for your event',
  'nav.home': 'Home',
  'nav.services': 'Services',
  'nav.gallery': 'Gallery',
  'nav.music': 'Music',
  'nav.pricing': 'Pricing',
  'nav.availability': 'Availability',
  'nav.about': 'About',
  'nav.testimonials': 'Reviews',
  'nav.faq': 'FAQ',
  'nav.blog': 'Blog',
  'nav.contact': 'Contact',
  'nav.menu': 'Menu',
  'nav.close': 'Close',
  'nav.skipToContent': 'Skip to main content',

  'cta.book': 'Check your date',
  'cta.checkDate': 'Check availability',
  'cta.call': 'Call us',
  'cta.viber': 'Viber',
  'cta.whatsapp': 'WhatsApp',
  'cta.seeMore': 'See more',
  'cta.seeAll': 'See all',
  'cta.listen': 'Play',

  'lang.switch': 'Български',
  'lang.label': 'Language',

  'pricing.from': 'from',
  'pricing.onRequest': 'On request',
  'pricing.note':
    'Prices are indicative and depend on the date, location and duration.',

  'availability.title': 'Availability',
  'availability.free': 'Available',
  'availability.busy': 'Booked',
  'availability.past': 'Past date',
  'availability.disclaimer':
    'This calendar is indicative. Please confirm your date with an enquiry.',
  'availability.unavailable':
    'The calendar is temporarily unavailable. Get in touch and we will check your date right away.',
  'availability.loading': 'Loading calendar…',

  'form.title': 'Enquiry',
  'form.name': 'Name',
  'form.phone': 'Phone',
  'form.email': 'Email',
  'form.date': 'Event date',
  'form.eventType': 'Event type',
  'form.city': 'City / venue',
  'form.guests': 'Number of guests',
  'form.message': 'Message',
  'form.consent':
    'I agree to my personal data being processed in order to answer this enquiry.',
  'form.submit': 'Send enquiry',
  'form.sending': 'Sending…',
  'form.success': 'Thank you! We will get back to you within 24 hours.',
  'form.error': 'Something went wrong. Please try again or call us.',
  'form.required': 'Required field',
  'form.optional': 'optional',
  'form.dateTaken': 'That date looks booked — message us about alternatives.',

  'footer.rights': 'All rights reserved.',
  'footer.privacy': 'Privacy policy',
  'footer.terms': 'Terms and conditions',

  'a11y.playMix': 'Play mix',
  'a11y.openImage': 'Open image',
  'a11y.previous': 'Previous',
  'a11y.next': 'Next',
};

const UI = { bg, en } satisfies Record<Locale, Record<UIKey, string>>;

export function useTranslations(lang: Locale) {
  return function t(key: UIKey): string {
    return UI[lang][key];
  };
}

export type { UIKey };
