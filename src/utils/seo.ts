import { Request } from 'express';

export const SITE_ORIGIN = 'https://lectio-api.org';

export const META_DESCRIPTION =
  'Revised Common Lectionary API, Book of Common Prayer Daily Office API, Catholic lectionary API, and liturgical calendar API for churches and apps.';

export const PAGE_TITLE = 'Lectio API — Revised Common Lectionary, Daily Office & Catholic Lectionary';

export const DOCS_TITLE = 'Lectio API Documentation — Revised Common Lectionary & Daily Office';

export const FAQ_TITLE = 'Lectio API FAQ — Today\'s Readings, RCL Year, and Daily Office';

export const FAQ_DESCRIPTION =
  'Answers for today\'s lectionary readings, the current Revised Common Lectionary year, the Book of Common Prayer Daily Office, and the Catholic lectionary API.';

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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What are today\'s lectionary readings?',
    answer:
      'GET /api/v1/readings/today?tradition=rcl returns Sunday or special-day Revised Common Lectionary readings when they exist, plus Book of Common Prayer Morning and Evening Prayer. Pass tz (an IANA time zone, default America/New_York) so today is the civil date in that zone rather than UTC. Example: curl "https://lectio-api.org/api/v1/readings/today?tradition=rcl&tz=America/New_York"',
  },
  {
    question: 'What RCL year is it?',
    answer:
      'The Revised Common Lectionary uses a three-year Sunday cycle (A, B, C) that changes on the First Sunday of Advent, not on January 1. Mid-2025 is Year C; Advent 1 on 30 November 2025 begins Year A. Ask GET /api/v1/calendar/current?tradition=rcl or request readings for a specific date.',
  },
  {
    question: 'How do I get Book of Common Prayer Daily Office readings?',
    answer:
      'Use tradition=bcp, or read the dailyOffice field on /readings/today, or call /api/v1/readings/daily?date=YYYY-MM-DD. Year One and Year Two flip at Advent 1. Year One begins at the Advent 1 preceding odd-numbered civil years.',
  },
  {
    question: 'Does Lectio API include the Catholic lectionary?',
    answer:
      'Yes. Pass tradition=catholic on the readings and calendar endpoints for the Roman Catholic lectionary.',
  },
  {
    question: 'What traditions are supported?',
    answer:
      'rcl (Revised Common Lectionary), catholic (Roman Catholic lectionary), episcopal (RCL Sundays with BCP Daily Office weekdays), and bcp (BCP Daily Office). List them with GET https://lectio-api.org/api/v1/traditions.',
  },
  {
    question: 'Is there an MCP server?',
    answer:
      'Yes. The repository includes a Model Context Protocol server in mcp-server/ so assistants can use Lectio API as tools. The REST API is at https://lectio-api.org and the OpenAPI document is at https://lectio-api.org/api/openapi.json.',
  },
];

function faqJsonLd(): object {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_ORIGIN}/faq#faq`,
    url: `${SITE_ORIGIN}/faq`,
    name: FAQ_TITLE,
    description: FAQ_DESCRIPTION,
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function landingJsonLd(baseUrl: string): string {
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
    ],
  };
  return JSON.stringify(graph);
}

export function faqPageJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#org`,
        name: 'Lectio API',
        url: SITE_ORIGIN,
        sameAs: ['https://github.com/asachs01/lectio-api'],
      },
      faqJsonLd(),
    ],
  });
}

export function docsJsonLd(baseUrl: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: DOCS_TITLE,
    description: META_DESCRIPTION,
    url: `${SITE_ORIGIN}/api/docs`,
    identifier: `${baseUrl}/api/openapi.json`,
    publisher: {
      '@type': 'Organization',
      name: 'Lectio API',
      url: SITE_ORIGIN,
    },
  });
}

export function pageHeadTags(options: {
  title: string;
  description: string;
  canonical: string;
  nonce: string;
  jsonLd: string;
}): string {
  const title = escapeHtml(options.title);
  const description = escapeHtml(options.description);
  const canonical = escapeHtml(options.canonical);
  return `
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Lectio API">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <script type="application/ld+json" nonce="${escapeHtml(options.nonce)}">${options.jsonLd}</script>`;
}

export function landingHeadTags(baseUrl: string, nonce: string): string {
  return pageHeadTags({
    title: PAGE_TITLE,
    description: META_DESCRIPTION,
    canonical: `${SITE_ORIGIN}/`,
    nonce,
    jsonLd: landingJsonLd(baseUrl),
  });
}

export function faqHeadTags(nonce: string): string {
  return pageHeadTags({
    title: FAQ_TITLE,
    description: FAQ_DESCRIPTION,
    canonical: `${SITE_ORIGIN}/faq`,
    nonce,
    jsonLd: faqPageJsonLd(),
  });
}

export function docsHeadTags(baseUrl: string, nonce: string): string {
  return pageHeadTags({
    title: DOCS_TITLE,
    description: META_DESCRIPTION,
    canonical: `${SITE_ORIGIN}/api/docs`,
    nonce,
    jsonLd: docsJsonLd(baseUrl),
  });
}

export const SHARED_PAGE_CSS = `
    :root {
      --primary: #4f46e5;
      --primary-dark: #4338ca;
      --text: #1f2937;
      --text-light: #6b7280;
      --bg: #ffffff;
      --bg-alt: #f9fafb;
      --border: #e5e7eb;
      --success: #10b981;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
    header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      padding: 80px 0;
      text-align: center;
    }
    header h1 { font-size: 3rem; margin-bottom: 16px; font-weight: 700; }
    header p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto 32px; }
    header a { color: white; }
    section { padding: 64px 0; }
    h2 { font-size: 2rem; margin-bottom: 32px; text-align: center; }
    .card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
    }
    .card h2 { font-size: 1.25rem; text-align: left; margin-bottom: 12px; color: var(--primary); }
    .card p { color: var(--text-light); }
    .code-example {
      background: #1e293b;
      color: #e2e8f0;
      padding: 16px 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.875rem;
      margin-top: 12px;
    }
    footer {
      background: var(--text);
      color: white;
      padding: 48px 0;
      text-align: center;
    }
    footer a { color: #93c5fd; }
    footer p { margin: 8px 0; opacity: 0.8; }
    @media (max-width: 640px) {
      header h1 { font-size: 2rem; }
      header p { font-size: 1rem; }
    }
`;

export function renderFaqPage(baseUrl: string, nonce: string): string {
  const items = FAQ_ITEMS.map((item, index) => {
    const id = `q${index + 1}`;
    return `<article class="card" id="${id}">
          <h2>${escapeHtml(item.question)}</h2>
          <p>${escapeHtml(item.answer)}</p>
        </article>`;
  }).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${faqHeadTags(nonce)}
  <style>${SHARED_PAGE_CSS}</style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Frequently asked questions</h1>
      <p>Answers about today's lectionary readings, the current RCL year, the Book of Common Prayer Daily Office, and the Catholic lectionary API.</p>
      <p><a href="${escapeHtml(baseUrl)}/">Back to Lectio API</a> · <a href="${escapeHtml(baseUrl)}/api/docs">API documentation</a></p>
    </div>
  </header>
  <section>
    <div class="container">
        ${items}
    </div>
  </section>
  <footer>
    <div class="container">
      <p><strong>Lectio API</strong> — Open source scripture readings API</p>
      <p>
        <a href="${escapeHtml(baseUrl)}/">Home</a> &bull;
        <a href="${escapeHtml(baseUrl)}/api/docs">API Documentation</a> &bull;
        <a href="https://github.com/asachs01/lectio-api">GitHub</a> &bull;
        <a href="${escapeHtml(baseUrl)}/llms.txt">llms.txt</a>
      </p>
    </div>
  </footer>
</body>
</html>`;
}
