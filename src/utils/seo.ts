import { Request } from 'express';

export const SITE_ORIGIN = 'https://lectio-api.org';
export const DOCS_ORIGIN = 'https://lectio-api.docs.buildwithfern.com';

const META_DESCRIPTION =
  'Revised Common Lectionary API, Book of Common Prayer Daily Office API, Catholic lectionary API, and liturgical calendar API for churches and apps.';

const PAGE_TITLE = 'Lectio API — Revised Common Lectionary, Daily Office & Catholic Lectionary';

export function publicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || 'localhost:3000';
  if (host.includes('lectio-api.org')) {
    return SITE_ORIGIN;
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0];
  return `${proto}://${host}`;
}

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What are today\'s lectionary readings?',
    answer:
      'GET /api/v1/readings/today?tradition=rcl returns Sunday or special-day Revised Common Lectionary readings when they exist, plus Book of Common Prayer Morning and Evening Prayer. Pass tz (an IANA time zone, default America/New_York) so today is the civil date in that zone rather than UTC.',
  },
  {
    question: 'What RCL year is it?',
    answer:
      'The Revised Common Lectionary uses a three-year Sunday cycle (A, B, C) that changes on the First Sunday of Advent, not on January 1. Ask GET /api/v1/calendar/current?tradition=rcl or request readings for a specific date.',
  },
  {
    question: 'How do I get Book of Common Prayer Daily Office readings?',
    answer:
      'Use tradition=bcp, or read the dailyOffice field on /readings/today. Year One and Year Two flip at Advent 1. Year One begins at the Advent 1 preceding odd-numbered civil years.',
  },
  {
    question: 'Does Lectio API include the Catholic lectionary?',
    answer:
      'Yes. Pass tradition=catholic on the readings and calendar endpoints for the Roman Catholic lectionary.',
  },
];

export function landingJsonLd(baseUrl: string): string {
  const faq = {
    '@type': 'FAQPage',
    '@id': `${SITE_ORIGIN}/#faq`,
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#org`,
        name: 'Lectio API',
        url: SITE_ORIGIN,
        sameAs: ['https://github.com/asachs01/lectio-api'],
      },
      {
        '@type': ['WebAPI', 'SoftwareApplication'],
        '@id': `${SITE_ORIGIN}/#api`,
        name: 'Lectio API',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        license: 'https://opensource.org/licenses/MIT',
        url: SITE_ORIGIN,
        description: META_DESCRIPTION,
        provider: { '@id': `${SITE_ORIGIN}/#org` },
        documentation: `${baseUrl}/api/docs`,
        termsOfService: 'https://github.com/asachs01/lectio-api',
      },
      faq,
    ],
  };
  return JSON.stringify(graph);
}

export function landingHeadTags(baseUrl: string, nonce: string): string {
  const jsonLd = landingJsonLd(baseUrl);
  return `
  <title>${PAGE_TITLE}</title>
  <meta name="description" content="${META_DESCRIPTION}">
  <link rel="canonical" href="${SITE_ORIGIN}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Lectio API">
  <meta property="og:title" content="${PAGE_TITLE}">
  <meta property="og:description" content="${META_DESCRIPTION}">
  <meta property="og:url" content="${SITE_ORIGIN}/">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${PAGE_TITLE}">
  <meta name="twitter:description" content="${META_DESCRIPTION}">
  <script type="application/ld+json" nonce="${nonce}">${jsonLd}</script>`;
}
