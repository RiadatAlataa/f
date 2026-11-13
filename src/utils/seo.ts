import { HomeSettings, NewsItem, VolunteerTeam, Initiative } from '../types';

export const CANONICAL_ORIGIN = 'https://www.riadataleata.com';

export interface RouteSeoConfig {
  title: string;
  description: string;
  canonicalPath: string;
  robots: 'index, follow' | 'noindex, nofollow';
  ogType?: 'website' | 'article';
  imageUrl?: string;
  structuredData?: Record<string, any>[];
}

function upsertMeta(attrName: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attrName}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(schemas: Record<string, any>[]) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('riadat-seo-jsonld');
  if (schemas.length === 0) {
    if (existing) existing.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'riadat-seo-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
}

export function buildVerifiedOrganizationSchema(settings?: HomeSettings) {
  const name = settings?.associationNameAr || 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة';
  const email = settings?.contactEmail || 'info@riadataleata.org.sa';
  const phone = settings?.contactPhone || '0541820904';
  const address = settings?.contactLocationAr || 'مكة المكرمة - مخطط العسيلة';
  const license = settings?.licenseNumber || '1000888600';
  const logoRaw = settings?.logoUrl && !settings.logoUrl.startsWith('data:')
    ? (settings.logoUrl.startsWith('http') ? settings.logoUrl : `${CANONICAL_ORIGIN}${settings.logoUrl.startsWith('/') ? '' : '/'}${settings.logoUrl}`)
    : `${CANONICAL_ORIGIN}/pwa-512x512.png`;

  const sameAs = (settings?.socialLinks || [])
    .filter((s) => s.enabled !== false && s.url && /^https?:\/\//i.test(s.url))
    .map((s) => s.url);

  const org: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': `${CANONICAL_ORIGIN}/#organization`,
    name,
    alternateName: settings?.associationNameEn || 'Riadat Al-Ata Association',
    url: CANONICAL_ORIGIN,
    logo: logoRaw,
    description:
      settings?.aboutUsAr ||
      'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - مؤسسة غير ربحية مرخصة تخدم المجتمع والمستفيدين والعمل التطوعي في مكة المكرمة.',
    identifier: license,
    telephone: phone,
    email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: 'مكة المكرمة',
      addressCountry: 'SA',
    },
  };
  if (sameAs.length > 0) {
    org.sameAs = sameAs;
  }

  const website: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${CANONICAL_ORIGIN}/#website`,
    url: CANONICAL_ORIGIN,
    name: settings?.siteNameAr || 'ريادة العطاء',
    inLanguage: 'ar-SA',
    publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
  };

  return [org, website];
}

export function resolveRouteSeo(params: {
  pathname: string;
  isAuthenticatedView?: boolean;
  settings?: HomeSettings;
  teams?: VolunteerTeam[];
  initiatives?: Initiative[];
  news?: NewsItem[];
}): RouteSeoConfig {
  const { pathname, isAuthenticatedView, settings, teams = [], initiatives = [], news = [] } = params;
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const assocName = settings?.associationNameAr || 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة';
  const defaultDesc =
    settings?.heroDescAr ||
    settings?.aboutUsAr ||
    'البوابة الرسمية لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة - المبادرات التطوعية، الفرق التطوعية، ورعاية المستفيدين.';

  // Private / Authenticated / Auth / Dashboard / Portal routes MUST be noindex
  const privatePrefixes = ['/login', '/auth', '/admin', '/dashboard', '/portal'];
  if (isAuthenticatedView || privatePrefixes.some((p) => cleanPath === p || cleanPath.startsWith(`${p}/`))) {
    const isRegister = cleanPath.startsWith('/register');
    if (!isRegister) {
      return {
        title: `بوابة الدخول والنظام الإداري | ${assocName}`,
        description: `بوابة الوصول الخاصة بمنسوبي ومستفيدي ومتطوعي ${assocName}.`,
        canonicalPath: cleanPath,
        robots: 'noindex, nofollow',
        structuredData: [],
      };
    }
  }

  if (cleanPath === '/register/beneficiary') {
    return {
      title: `الانضمام كمستفيد | ${assocName}`,
      description: `تقديم طلب تسجيل مستفيد جديد في ${assocName} بالعسيلة بمكة المكرمة.`,
      canonicalPath: '/register/beneficiary',
      robots: 'index, follow',
      structuredData: buildVerifiedOrganizationSchema(settings),
    };
  }

  if (cleanPath === '/register/volunteer') {
    return {
      title: `الانضمام كمتطوع | ${assocName}`,
      description: `بوابة التطوع الرسمية والانضمام إلى الفرق التطوعية في ${assocName}.`,
      canonicalPath: '/register/volunteer',
      robots: 'index, follow',
      structuredData: buildVerifiedOrganizationSchema(settings),
    };
  }

  if (cleanPath === '/opportunities') {
    return {
      title: `الفرص والمبادرات التطوعية | ${assocName}`,
      description: `تصفح الفرص التطوعية والمبادرات المجتمعية المعتمدة لدى ${assocName} وسجل مشاركتك الآن.`,
      canonicalPath: '/opportunities',
      robots: 'index, follow',
      structuredData: buildVerifiedOrganizationSchema(settings),
    };
  }

  if (cleanPath.startsWith('/opportunities/')) {
    const oppId = decodeURIComponent(cleanPath.slice('/opportunities/'.length));
    const opp = initiatives.find((i) => i.id === oppId || i.opportunityCode === oppId);
    if (opp) {
      return {
        title: `${opp.title || opp.name || 'فرصة تطوعية'} | ${assocName}`,
        description: (opp.description || defaultDesc).slice(0, 160),
        canonicalPath: `/opportunities/${encodeURIComponent(opp.id)}`,
        robots: 'index, follow',
        ogType: 'article',
        structuredData: buildVerifiedOrganizationSchema(settings),
      };
    }
  }

  if (cleanPath.startsWith('/teams/')) {
    const teamId = decodeURIComponent(cleanPath.slice('/teams/'.length));
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      const name = team.nameAr || team.name || 'فريق تطوعي';
      return {
        title: `${name} | الفرق التطوعية - ${assocName}`,
        description: (team.descriptionAr || team.vision || `تعرف على ${name} التابع لـ ${assocName} وانضم للعمل التطوعي.`).slice(0, 160),
        canonicalPath: `/teams/${encodeURIComponent(team.id)}`,
        robots: 'index, follow',
        structuredData: buildVerifiedOrganizationSchema(settings),
      };
    }
  }

  if (cleanPath.startsWith('/news/')) {
    const newsId = decodeURIComponent(cleanPath.slice('/news/'.length));
    const item = news.find((n) => n.id === newsId);
    if (item) {
      return {
        title: `${item.titleAr} | أخبار ${assocName}`,
        description: (item.bodyAr || defaultDesc).slice(0, 160),
        canonicalPath: `/news/${encodeURIComponent(item.id)}`,
        robots: 'index, follow',
        ogType: 'article',
        structuredData: buildVerifiedOrganizationSchema(settings),
      };
    }
  }

  if (cleanPath === '/gallery') {
    return {
      title: `معرض الصور والمركز الإعلامي | ${assocName}`,
      description: `صور وفيديوهات توثيق المبادرات والفعاليات المجتمعية في ${assocName}.`,
      canonicalPath: '/gallery',
      robots: 'index, follow',
      structuredData: buildVerifiedOrganizationSchema(settings),
    };
  }

  return {
    title: `${assocName} | البوابة الرسمية`,
    description: defaultDesc.slice(0, 160),
    canonicalPath: '/',
    robots: 'index, follow',
    ogType: 'website',
    structuredData: buildVerifiedOrganizationSchema(settings),
  };
}

export function applyRouteSeo(config: RouteSeoConfig) {
  if (typeof document === 'undefined') return;
  const canonicalUrl = `${CANONICAL_ORIGIN}${config.canonicalPath === '/' ? '/' : config.canonicalPath}`;
  document.title = config.title;
  upsertMeta('name', 'description', config.description);
  upsertMeta('name', 'robots', config.robots);
  upsertMeta('property', 'og:title', config.title);
  upsertMeta('property', 'og:description', config.description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:type', config.ogType || 'website');
  upsertMeta('property', 'og:locale', 'ar_SA');
  if (config.imageUrl) {
    upsertMeta('property', 'og:image', config.imageUrl);
  }
  upsertCanonical(canonicalUrl);
  upsertJsonLd(config.structuredData || []);
}
