"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  articleType: string;
  content: string;
  excerpt: string | null;
  sopVersion: string | null;
  sopOwner: string | null;
  sopRequired: boolean;
  authorName: string | null;
  authorImage: string | null;
  updatedAt: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface BacklinkArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  FRANCHISE_FAQ: "FAQ",
  BUSINESS_MODEL: "Business Model",
  TERRITORY_INFO: "Territory",
  TRAINING_SUPPORT: "Training & Support",
  TESTIMONIALS: "Testimonials",
  CHESS_BENEFITS: "Chess Benefits",
  COMPANY_INFO: "Company Info",
  INVESTMENT: "Investment",
  PROCESS: "Process",
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  SALES: "Sales",
  LEGAL: "Legal",
  FINANCE: "Finance",
  ADMINISTRATION: "Administration",
};

const CATEGORY_COLORS: Record<string, string> = {
  FRANCHISE_FAQ: "bg-blue-100 text-blue-700",
  BUSINESS_MODEL: "bg-indigo-100 text-indigo-700",
  TERRITORY_INFO: "bg-green-100 text-green-700",
  TRAINING_SUPPORT: "bg-purple-100 text-purple-700",
  TESTIMONIALS: "bg-amber-100 text-amber-700",
  CHESS_BENEFITS: "bg-cyan-100 text-cyan-700",
  COMPANY_INFO: "bg-slate-100 text-slate-700",
  INVESTMENT: "bg-emerald-100 text-emerald-700",
  PROCESS: "bg-orange-100 text-orange-700",
  OPERATIONS: "bg-rose-100 text-rose-700",
  MARKETING: "bg-pink-100 text-pink-700",
  SALES: "bg-teal-100 text-teal-700",
  LEGAL: "bg-gray-100 text-gray-700",
  FINANCE: "bg-emerald-100 text-emerald-700",
  ADMINISTRATION: "bg-slate-100 text-slate-700",
};

const ARTICLE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof BookOpenIcon; color: string }
> = {
  ARTICLE: {
    label: "Article",
    icon: BookOpenIcon,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  SOP: {
    label: "SOP",
    icon: ClipboardDocumentCheckIcon,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  GUIDE: {
    label: "Guide",
    icon: AcademicCapIcon,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  FAQ: {
    label: "FAQ",
    icon: QuestionMarkCircleIcon,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function extractToc(html: string): TocItem[] {
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const items: TocItem[] = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");
    items.push({ id, text, level });
  }
  return items;
}

function injectHeadingIds(html: string): string {
  return html.replace(
    /<h([23])([^>]*)>(.*?)<\/h([23])>/gi,
    (_match, level, attrs, content) => {
      const text = content.replace(/<[^>]*>/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w]+/g, "-")
        .replace(/^-|-$/g, "");
      return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
    }
  );
}

function ArticleSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-64 bg-gray-200 rounded mb-6" />
      <div className="h-5 w-24 bg-gray-200 rounded-full mb-3" />
      <div className="h-10 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-40 bg-gray-100 rounded mb-8" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-4/5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function RelatedArticleCard({ article }: { article: RelatedArticle }) {
  return (
    <Link
      href={`/wiki/${article.slug || article.id}`}
      className="group block bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm hover:border-brand-cyan/30 transition-all"
    >
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
          CATEGORY_COLORS[article.category] || "bg-gray-100 text-gray-700"
        }`}
      >
        {CATEGORY_LABELS[article.category] || article.category}
      </span>
      <h4 className="text-sm font-medium text-gray-800 group-hover:text-brand-navy transition-colors line-clamp-2">
        {article.title}
      </h4>
    </Link>
  );
}

function TableOfContents({
  items,
  activeId,
  onItemClick,
}: {
  items: TocItem[];
  activeId: string;
  onItemClick: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <nav>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        On this page
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onItemClick(item.id)}
              className={`block w-full text-left text-sm py-1 transition-colors ${
                item.level === 3 ? "pl-4" : ""
              } ${
                activeId === item.id
                  ? "text-brand-navy font-medium"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function KnowledgeBaseArticlePage() {
  const params = useParams();
  const articleSlugOrId = (params.slug || params.id) as string;
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [backlinks, setBacklinks] = useState<BacklinkArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/franchisee/knowledge-base/${articleSlugOrId}`
        );
        if (res.status === 404) {
          setError("Article not found");
          return;
        }
        if (!res.ok) {
          setError("Failed to load article");
          return;
        }
        const data = await res.json();
        setArticle(data.article);
        setRelated(data.related || []);
        setBacklinks(data.backlinks || []);
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    }

    if (articleSlugOrId) {
      fetchArticle();
    }
  }, [articleSlugOrId]);

  // IntersectionObserver for active heading tracking
  useEffect(() => {
    if (!article || !contentRef.current) return;

    const headings = contentRef.current.querySelectorAll("h2, h3");
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0 && visible[0].target.id) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach((h) => {
      if (h.id) observer.observe(h);
    });

    return () => observer.disconnect();
  }, [article]);

  const handleTocClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  }, []);

  // Broadcast article context so EarlCoachWidget knows what page we're on
  useEffect(() => {
    if (article) {
      window.dispatchEvent(
        new CustomEvent("earl-page-context", {
          detail: {
            title: article.title,
            description: article.excerpt || `Wiki article: ${article.title} (${CATEGORY_LABELS[article.category] || article.category})`,
          },
        })
      );
    }
    return () => {
      window.dispatchEvent(new CustomEvent("earl-page-context", { detail: null }));
    };
  }, [article]);

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <ArticleSkeleton />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {error || "Article not found"}
          </h3>
          <p className="text-gray-500 mb-6">
            This article may have been removed or is not available.
          </p>
          <button
            onClick={() => router.push("/portal/learning/knowledge-base")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-navy text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Franchise Wiki
          </button>
        </div>
      </div>
    );
  }

  const tocItems = extractToc(article.content);
  const processedContent = injectHeadingIds(article.content);
  const typeConfig = ARTICLE_TYPE_CONFIG[article.articleType] || ARTICLE_TYPE_CONFIG.ARTICLE;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link
          href="/portal/learning/knowledge-base"
          className="hover:text-brand-navy transition-colors"
        >
          Learning Center
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <Link
          href="/portal/learning/knowledge-base"
          className="hover:text-brand-navy transition-colors"
        >
          Franchise Wiki
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-none">
          {article.title}
        </span>
      </nav>

      {/* Back Link */}
      <Link
        href="/portal/learning/knowledge-base"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-navy transition-colors mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Franchise Wiki
      </Link>

      <div className="lg:flex lg:gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Article Header */}
          <div className="mb-8">
            {/* Article type badge */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${typeConfig.color}`}
              >
                <TypeIcon className="h-3.5 w-3.5" />
                {typeConfig.label}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-brand-navy mb-3">
              {article.title}
            </h1>

            {/* Excerpt callout */}
            {article.excerpt && (
              <div className="bg-brand-light border-l-4 border-brand-cyan p-4 rounded-r-lg mb-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {article.excerpt}
                </p>
              </div>
            )}

            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  CATEGORY_COLORS[article.category] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {CATEGORY_LABELS[article.category] || article.category}
              </span>
              <span className="text-gray-300">|</span>
              {article.authorName && (
                <>
                  <span className="flex items-center gap-1.5">
                    {article.authorImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.authorImage}
                        alt={article.authorName}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-brand-navy text-white text-[10px] font-bold flex items-center justify-center">
                        {article.authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {article.authorName}
                  </span>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <span>Last updated {formatDate(article.updatedAt)}</span>
              {article.articleType === "SOP" && article.sopVersion && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>Version {article.sopVersion}</span>
                </>
              )}
              {article.articleType === "SOP" && article.sopOwner && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>Owner: {article.sopOwner}</span>
                </>
              )}
            </div>
          </div>

          {/* Mobile TOC (collapsible) */}
          {tocItems.length > 0 && (
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="w-full flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm font-medium text-gray-700"
              >
                <span>On this page ({tocItems.length} sections)</span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${
                    tocOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {tocOpen && (
                <div className="bg-gray-50 rounded-b-lg px-4 pb-3 -mt-1">
                  <TableOfContents
                    items={tocItems}
                    activeId={activeHeadingId}
                    onItemClick={handleTocClick}
                  />
                </div>
              )}
            </div>
          )}

          {/* Article Content */}
          <div
            ref={contentRef}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8"
          >
            <div
              className={[
                "max-w-none",
                "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-brand-navy [&_h1]:mb-4 [&_h1]:mt-6",
                "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-brand-navy [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:scroll-mt-24",
                "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-brand-navy [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:scroll-mt-24",
                "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:mb-2 [&_h4]:mt-3",
                "[&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4",
                "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-gray-700",
                "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:text-gray-700",
                "[&_li]:mb-1 [&_li]:leading-relaxed",
                "[&_a]:text-brand-cyan [&_a]:underline [&_a]:hover:text-brand-purple",
                "[&_a.wiki-link]:text-brand-navy [&_a.wiki-link]:font-medium [&_a.wiki-link]:no-underline [&_a.wiki-link]:border-b [&_a.wiki-link]:border-brand-navy/30 [&_a.wiki-link]:hover:border-brand-navy",
                "[&_strong]:font-semibold [&_strong]:text-gray-900",
                "[&_em]:italic",
                "[&_blockquote]:border-l-4 [&_blockquote]:border-brand-cyan [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4",
                "[&_table]:w-full [&_table]:border-collapse [&_table]:mb-4",
                "[&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold",
                "[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm",
                "[&_hr]:my-6 [&_hr]:border-gray-200",
                "[&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
                "[&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4",
                "[&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4",
              ].join(" ")}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </div>

          {/* Ask Earl CTA */}
          <div className="bg-gradient-to-r from-brand-light to-cyan-50 rounded-xl border border-brand-cyan/20 p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-navy mb-1">
                  Have questions about this topic?
                </h3>
                <p className="text-gray-600 text-sm">
                  Ask Earl for more details, examples, or clarification on
                  anything covered in this article.
                </p>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("earl-coach-open", {
                      detail: {
                        moduleTitle: article.title,
                        moduleDescription: article.excerpt || `Wiki article: ${article.title} (${CATEGORY_LABELS[article.category] || article.category})`,
                      },
                    })
                  );
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-cyan text-brand-navy font-semibold rounded-lg hover:bg-opacity-80 transition-colors whitespace-nowrap"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                Ask Earl about this
              </button>
            </div>
          </div>

          {/* What Links Here */}
          {backlinks.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-800">
                  What Links Here
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {backlinks.map((bl) => (
                  <Link
                    key={bl.id}
                    href={`/wiki/${bl.slug || bl.id}`}
                    className="group flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm hover:border-brand-cyan/30 transition-all"
                  >
                    <div className="min-w-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${
                          CATEGORY_COLORS[bl.category] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {CATEGORY_LABELS[bl.category] || bl.category}
                      </span>
                      <h4 className="text-sm font-medium text-gray-800 group-hover:text-brand-navy transition-colors line-clamp-1">
                        {bl.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles - Mobile (below content) */}
          {related.length > 0 && (
            <div className="lg:hidden mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Related Articles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.map((r) => (
                  <RelatedArticleCard key={r.id} article={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            {/* TOC */}
            {tocItems.length > 0 && (
              <TableOfContents
                items={tocItems}
                activeId={activeHeadingId}
                onItemClick={handleTocClick}
              />
            )}

            {/* Related Articles */}
            {related.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Related Articles
                </h3>
                <div className="space-y-3">
                  {related.map((r) => (
                    <RelatedArticleCard key={r.id} article={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
