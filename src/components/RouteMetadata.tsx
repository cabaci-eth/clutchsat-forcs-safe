import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SchemaValue = Record<string, unknown>;

interface RouteSeo {
  title: string;
  description: string;
  robots?: string;
  schema?: SchemaValue;
}

const SITE_NAME = "ClutchSAT";
const SITE_URL = "https://clutchsat.com";
const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4684b9a7-9192-457f-8bb8-13e2190d36b0/id-preview-c34aa7df--de314dce-5992-4868-bcec-83942056fed6.lovable.app-1772354446096.png";
const DEFAULT_DESCRIPTION = "Free SAT prep with practice questions, mock tests, flashcards, quizzes, AI tutoring, and personalized study plans.";
const DEFAULT_ROBOTS = "index, follow";
const NOINDEX_ROBOTS = "noindex, follow";

const buildCanonicalUrl = (pathname: string) => `${SITE_URL}${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}`;

const createWebPageSchema = (pathname: string, name: string, description: string, type: "WebPage" | "CollectionPage" = "WebPage"): SchemaValue => ({
  "@context": "https://schema.org",
  "@type": type,
  name,
  description,
  url: buildCanonicalUrl(pathname),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
  },
});

const getSeoForPath = (pathname: string): RouteSeo => {
  if (pathname === "/") {
    const title = "ClutchSAT | SAT Prep, Mock Tests, Flashcards & AI Tutor";
    const description = "Free SAT prep with 2,000+ practice questions, Bluebook-style mock tests, flashcards, quizzes, AI tutoring, and personalized study plans.";

    return {
      title,
      description,
      schema: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description,
      },
    };
  }

  if (pathname === "/practice") {
    const title = "SAT Practice Questions | ClutchSAT";
    const description = "Practice SAT math, reading, and writing questions with explanations, filters, bookmarks, and review tools.";

    return { title, description, schema: createWebPageSchema(pathname, title, description, "CollectionPage") };
  }

  if (pathname === "/flashcards") {
    const title = "SAT Flashcards | ClutchSAT";
    const description = "Study SAT vocabulary and math formulas with spaced-repetition flashcards and difficulty tracking.";

    return { title, description, schema: createWebPageSchema(pathname, title, description, "CollectionPage") };
  }

  if (pathname === "/quiz") {
    const title = "SAT Quiz Mode | ClutchSAT";
    const description = "Take timed or untimed SAT quizzes, get instant feedback, and sharpen your pacing across every section.";

    return { title, description, schema: createWebPageSchema(pathname, title, description) };
  }

  if (pathname === "/mock-tests") {
    const title = "SAT Mock Tests | ClutchSAT";
    const description = "Train with Bluebook-style SAT mock tests in practice and full simulation modes with scoring insights.";

    return { title, description, schema: createWebPageSchema(pathname, title, description, "CollectionPage") };
  }

  if (pathname === "/forum") {
    const title = "SAT Forum & Community | ClutchSAT";
    const description = "Ask questions, share strategies, and learn with other students in the ClutchSAT SAT forum.";

    return { title, description, schema: createWebPageSchema(pathname, title, description) };
  }

  if (pathname === "/pricing") {
    const title = "ClutchSAT Pricing | Premium SAT Prep";
    const description = "Compare ClutchSAT free and premium features, including unlimited AI tutoring, mock tests, and advanced tools.";

    return { title, description, schema: createWebPageSchema(pathname, title, description) };
  }

  if (pathname === "/score-calculator") {
    const title = "SAT Score Calculator | ClutchSAT";
    const description = "Convert raw section performance into estimated SAT scores with ClutchSAT’s score calculator.";

    return { title, description, schema: createWebPageSchema(pathname, title, description) };
  }

  if (pathname === "/about" || pathname === "/contact" || pathname === "/privacy") {
    const pageName = pathname === "/about" ? "About ClutchSAT" : pathname === "/contact" ? "Contact ClutchSAT" : "ClutchSAT Privacy Policy";
    const description = pathname === "/about"
      ? "Learn how ClutchSAT helps students prepare for the SAT with smarter practice, tutoring, and planning tools."
      : pathname === "/contact"
        ? "Get in touch with the ClutchSAT team for support, feedback, or partnership questions."
        : "Read the ClutchSAT privacy policy and learn how your data is handled across the platform.";

    return { title: `${pageName} | ClutchSAT`, description, schema: createWebPageSchema(pathname, pageName, description) };
  }

  if (pathname.startsWith("/tools/")) {
    const title = "SAT Tools & Simulators | ClutchSAT";
    const description = "Explore ClutchSAT’s interactive tools, calculators, and learning simulations.";

    return { title, description, schema: createWebPageSchema(pathname, title, description) };
  }

  if (
    pathname === "/dashboard" ||
    pathname === "/progress" ||
    pathname === "/plan" ||
    pathname === "/profile" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/community" ||
    pathname.startsWith("/admin") ||
    /^\/mock-tests\/[^/]+\/(practice|simulation)$/.test(pathname)
  ) {
    const title = "ClutchSAT";
    return {
      title,
      description: DEFAULT_DESCRIPTION,
      robots: NOINDEX_ROBOTS,
    };
  }

  return {
    title: `${SITE_NAME} | SAT Prep Platform`,
    description: DEFAULT_DESCRIPTION,
    robots: NOINDEX_ROBOTS,
  };
};

const upsertMeta = (attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

const upsertJsonLd = (id: string, schema?: SchemaValue) => {
  const existing = document.getElementById(id) as HTMLScriptElement | null;

  if (!schema) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("script");
  element.id = id;
  element.type = "application/ld+json";
  element.textContent = JSON.stringify(schema);

  if (!existing) {
    document.head.appendChild(element);
  }
};

const RouteMetadata = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(pathname);
    const canonical = buildCanonicalUrl(pathname);

    document.title = seo.title;

    upsertMeta("name", "description", seo.description);
    upsertMeta("name", "robots", seo.robots ?? DEFAULT_ROBOTS);
    upsertMeta("name", "author", SITE_NAME);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:site", "@ClutchSAT");
    upsertMeta("name", "twitter:title", seo.title);
    upsertMeta("name", "twitter:description", seo.description);
    upsertMeta("name", "twitter:image", OG_IMAGE);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:title", seo.title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:image", OG_IMAGE);

    upsertCanonical(canonical);
    upsertJsonLd("route-jsonld", seo.schema);
  }, [pathname]);

  return null;
};

export default RouteMetadata;