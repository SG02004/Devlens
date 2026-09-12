import { Article, CategoryId } from "../types";

/**
 * Interface representing an extensible Feed Source Adapter.
 * Anyone can add a new source (e.g. Medium, Reddit, Substack, GitHub Releases, RSS)
 * simply by implementing this interface and calling `feedManager.registerSource()`.
 */
export interface FeedSource {
  id: string;
  name: string;
  type: "api" | "rss" | "algolia" | "custom";
  description: string;
  enabled: boolean;
  url?: string;
  gatherArticles(existingUrls: Set<string>): Promise<Article[]>;
}

// -----------------------------------------------------------------------------
// Source 1: Dev.to Engineering API Adapter
// -----------------------------------------------------------------------------
export class DevToFeedSource implements FeedSource {
  id = "devto";
  name = "Dev.to";
  type = "api" as const;
  description = "Top technical posts, architecture patterns, and engineering practices.";
  enabled = true;
  url = "https://dev.to/api/articles";

  async gatherArticles(existingUrls: Set<string>): Promise<Article[]> {
    const articles: Article[] = [];
    try {
      const res = await fetch("https://dev.to/api/articles?per_page=6&top=7", {
        headers: { "User-Agent": "DevLens-FeedManager/1.0" },
      });
      if (!res.ok) return articles;

      const items = (await res.json()) as any[];
      items.forEach((item, idx) => {
        if (!item.url || existingUrls.has(item.url)) return;

        const tags = Array.isArray(item.tag_list) ? item.tag_list : [];
        let category: CategoryId = "web-dev";
        if (tags.some((t: string) => ["ai", "machinelearning", "python", "datascience", "llm"].includes(t.toLowerCase()))) {
          category = "ai-ml";
        } else if (tags.some((t: string) => ["docker", "kubernetes", "devops", "ci", "linux"].includes(t.toLowerCase()))) {
          category = "devops";
        } else if (tags.some((t: string) => ["security", "crypto", "auth", "cyber"].includes(t.toLowerCase()))) {
          category = "cybersecurity";
        } else if (tags.some((t: string) => ["cloud", "aws", "architecture", "database", "distributed"].includes(t.toLowerCase()))) {
          category = "cloud-systems";
        } else if (tags.some((t: string) => ["react", "frontend", "typescript", "javascript"].includes(t.toLowerCase()))) {
          category = "web-dev";
        }

        articles.push({
          id: `devto-${item.id || Date.now() + idx}`,
          title: item.title,
          source: "Dev.to",
          sourceUrl: item.url,
          author: item.user?.name || "Dev.to Contributor",
          publishedAt: item.published_at || new Date().toISOString(),
          category,
          categoryLabel: category.replace("-", " ").toUpperCase(),
          readTimeMinutes: item.reading_time_minutes || 6,
          difficulty: "Intermediate",
          summary: item.description || "In-depth engineering exploration of modern software architecture.",
          whyItMatters: "Direct insight from production practitioners addressing scale, reliability, and code craftsmanship.",
          keyTakeaways: [
            "Production-ready design patterns with minimal architectural overhead.",
            "Benchmarking and error handling for critical paths.",
            "Practical tradeoffs directly applicable to system design interviews.",
          ],
          skillsExtracted: tags.slice(0, 5).map((t: string) => String(t).toUpperCase()),
          upvotes: item.public_reactions_count || 48,
          commentsCount: item.comments_count || 12,
          isRead: false,
          isBookmarked: false,
        });
      });
    } catch (err) {
      console.warn("Dev.to gathering fallback active:", err);
    }
    return articles;
  }
}

// -----------------------------------------------------------------------------
// Source 2: Hacker News Algolia Systems Adapter
// -----------------------------------------------------------------------------
export class HackerNewsFeedSource implements FeedSource {
  id = "hackernews";
  name = "Hacker News";
  type = "algolia" as const;
  description = "Production post-mortems, distributed systems discussions, and CS breakthroughs.";
  enabled = true;
  url = "https://hn.algolia.com/api";

  async gatherArticles(existingUrls: Set<string>): Promise<Article[]> {
    const articles: Article[] = [];
    try {
      const res = await fetch(
        "https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points>25&hitsPerPage=6"
      );
      if (!res.ok) return articles;

      const data = (await res.json()) as { hits: any[] };
      data.hits.forEach((item, idx) => {
        const itemUrl = item.url || `https://news.ycombinator.com/item?id=${item.objectID}`;
        if (existingUrls.has(itemUrl) || !item.title) return;

        let category: CategoryId = "cloud-systems";
        const titleLower = item.title.toLowerCase();
        if (titleLower.includes("ai") || titleLower.includes("gpt") || titleLower.includes("model") || titleLower.includes("neural")) {
          category = "ai-ml";
        } else if (titleLower.includes("security") || titleLower.includes("vulnerability") || titleLower.includes("hack") || titleLower.includes("cve")) {
          category = "cybersecurity";
        } else if (titleLower.includes("web") || titleLower.includes("frontend") || titleLower.includes("browser") || titleLower.includes("react")) {
          category = "web-dev";
        }

        articles.push({
          id: `hn-${item.objectID || Date.now() + idx}`,
          title: item.title,
          source: "Hacker News",
          sourceUrl: itemUrl,
          author: item.author ? `${item.author} (HN)` : "HN Community",
          publishedAt: item.created_at || new Date().toISOString(),
          category,
          categoryLabel: category.replace("-", " ").toUpperCase(),
          readTimeMinutes: 7,
          difficulty: "Advanced",
          summary: `Technical discussion and deep architectural insights regarding: ${item.title}`,
          whyItMatters: "Highlights real-world production concurrency challenges, infrastructure trends, and post-mortems.",
          keyTakeaways: [
            "Technical community consensus on modern software architecture.",
            "Concurrency bottlenecks and operational resilience in distributed workloads.",
            "Evaluating system boundaries and defensive programming principles.",
          ],
          skillsExtracted: ["Distributed Systems", "Performance", "Linux", "Concurrency"],
          upvotes: item.points || 85,
          commentsCount: item.num_comments || 30,
          isRead: false,
          isBookmarked: false,
        });
      });
    } catch (err) {
      console.warn("HackerNews gathering fallback active:", err);
    }
    return articles;
  }
}

// -----------------------------------------------------------------------------
// Source 3: arXiv Research Preprints Adapter
// -----------------------------------------------------------------------------
export class ArXivFeedSource implements FeedSource {
  id = "arxiv";
  name = "arXiv";
  type = "api" as const;
  description = "Peer-reviewed preprints covering artificial intelligence, distributed algorithms, and software engineering.";
  enabled = true;
  url = "https://export.arxiv.org/api/query";

  async gatherArticles(existingUrls: Set<string>): Promise<Article[]> {
    const articles: Article[] = [];
    try {
      const res = await fetch(
        "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.SE+OR+cat:cs.DC&sortBy=submittedDate&sortOrder=descending&max_results=4"
      );
      if (!res.ok) return articles;

      const text = await res.text();
      const entries = text.split("<entry>").slice(1);

      entries.forEach((entry, idx) => {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);

        if (titleMatch && idMatch) {
          const title = titleMatch[1].replace(/\s+/g, " ").trim();
          const summary = summaryMatch
            ? summaryMatch[1].replace(/\s+/g, " ").trim().slice(0, 320) + "..."
            : "arXiv Computer Science research preprint.";
          const url = idMatch[1].trim();

          if (existingUrls.has(url)) return;

          articles.push({
            id: `arxiv-${Date.now() + idx}`,
            title,
            source: "arXiv",
            sourceUrl: url,
            author: "arXiv Research Group",
            publishedAt: new Date().toISOString(),
            category: "ai-ml",
            categoryLabel: "AI & MACHINE LEARNING",
            readTimeMinutes: 12,
            difficulty: "Advanced",
            summary,
            whyItMatters: "Presents foundational mathematical modeling and algorithmic evaluation advancing state-of-the-art computer systems.",
            keyTakeaways: [
              "Empirical evaluation and benchmarking against industry baselines.",
              "Algorithmic complexity guarantees and scaling bounds.",
              "Foundational theoretical background for senior technical defense.",
            ],
            skillsExtracted: ["Machine Learning", "Research Methodology", "Neural Architecture", "Complexity Theory"],
            upvotes: 140,
            commentsCount: 16,
            isRead: false,
            isBookmarked: false,
          });
        }
      });
    } catch (err) {
      console.warn("arXiv gathering fallback active:", err);
    }
    return articles;
  }
}

// -----------------------------------------------------------------------------
// Source 4: Generic RSS / Atom Feed Adapter (Template for adding any source)
// -----------------------------------------------------------------------------
export class GenericRssFeedSource implements FeedSource {
  id: string;
  name: string;
  type = "rss" as const;
  description: string;
  enabled: boolean;
  url: string;
  defaultCategory: CategoryId;

  constructor(id: string, name: string, url: string, defaultCategory: CategoryId = "cloud-systems", description?: string) {
    this.id = id;
    this.name = name;
    this.url = url;
    this.defaultCategory = defaultCategory;
    this.enabled = true;
    this.description = description || `RSS / Atom feed from ${name}`;
  }

  async gatherArticles(existingUrls: Set<string>): Promise<Article[]> {
    const articles: Article[] = [];
    try {
      const res = await fetch(this.url, { headers: { "User-Agent": "DevLens-RssGatherer/1.0" } });
      if (!res.ok) return articles;

      const xmlText = await res.text();
      // Simple parser for standard RSS <item> or Atom <entry>
      const itemBlocks = xmlText.includes("<item>")
        ? xmlText.split("<item>").slice(1)
        : xmlText.split("<entry>").slice(1);

      itemBlocks.slice(0, 4).forEach((block, idx) => {
        const titleMatch = block.match(/<title(?:[^>]*)>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link(?:[^>]*)>(?:([\s\S]*?)<\/link>)?/) || block.match(/href="([^"]+)"/);
        const descMatch = block.match(/<description(?:[^>]*)>([\s\S]*?)<\/description>/) || block.match(/<summary(?:[^>]*)>([\s\S]*?)<\/summary>/);

        if (titleMatch) {
          const rawTitle = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
          const rawLink = linkMatch ? (linkMatch[1] || linkMatch[0]).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : `${this.url}#${idx}`;
          const rawDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim().slice(0, 280) + "..." : "Engineering publication.";

          if (existingUrls.has(rawLink)) return;

          articles.push({
            id: `${this.id}-${Date.now() + idx}`,
            title: rawTitle,
            source: this.name as any,
            sourceUrl: rawLink,
            author: `${this.name} Editorial`,
            publishedAt: new Date().toISOString(),
            category: this.defaultCategory,
            categoryLabel: this.defaultCategory.replace("-", " ").toUpperCase(),
            readTimeMinutes: 6,
            difficulty: "Intermediate",
            summary: rawDesc,
            whyItMatters: `Architecture practices and engineering lessons from ${this.name}.`,
            keyTakeaways: [
              "Production lessons and real-world system patterns.",
              "Resilient engineering under scale.",
            ],
            skillsExtracted: [this.name, "Architecture", "Engineering"],
            upvotes: 42,
            commentsCount: 6,
            isRead: false,
            isBookmarked: false,
          });
        }
      });
    } catch (err) {
      console.warn(`RSS feed source ${this.name} gather error:`, err);
    }
    return articles;
  }
}

// -----------------------------------------------------------------------------
// Feed Manager Registry
// -----------------------------------------------------------------------------
export class FeedManager {
  private sources: Map<string, FeedSource> = new Map();

  constructor() {
    // Register default out-of-the-box sources
    this.registerSource(new DevToFeedSource());
    this.registerSource(new HackerNewsFeedSource());
    this.registerSource(new ArXivFeedSource());
  }

  /**
   * Register any new feed source adapter.
   */
  registerSource(source: FeedSource): void {
    this.sources.set(source.id, source);
  }

  /**
   * Add a custom RSS source easily.
   */
  addCustomRssSource(id: string, name: string, url: string, category: CategoryId, description?: string): FeedSource {
    const src = new GenericRssFeedSource(id, name, url, category, description);
    this.registerSource(src);
    return src;
  }

  /**
   * Remove a source by id.
   */
  removeSource(id: string): boolean {
    return this.sources.delete(id);
  }

  /**
   * Toggle a source on/off.
   */
  toggleSource(id: string, enabled: boolean): boolean {
    const src = this.sources.get(id);
    if (src) {
      src.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * List all configured sources and their metadata.
   */
  listSources(): Array<{ id: string; name: string; type: string; description: string; enabled: boolean; url?: string }> {
    return Array.from(this.sources.values()).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      description: s.description,
      enabled: s.enabled,
      url: s.url,
    }));
  }

  /**
   * Run gathering across all enabled sources concurrently.
   */
  async gatherAll(existingArticles: Article[]): Promise<{ newArticles: Article[]; logs: string[] }> {
    const logs: string[] = [];
    const existingUrls = new Set(existingArticles.map((a) => a.sourceUrl));
    const newlyIngested: Article[] = [];

    const enabledSources = Array.from(this.sources.values()).filter((s) => s.enabled);
    logs.push(`Initiating ingestion across ${enabledSources.length} active sources...`);

    const results = await Promise.allSettled(
      enabledSources.map(async (source) => {
        logs.push(`Polling source [${source.name}]...`);
        const items = await source.gatherArticles(existingUrls);
        logs.push(`Source [${source.name}] delivered ${items.length} new items.`);
        return items;
      })
    );

    for (const res of results) {
      if (res.status === "fulfilled") {
        for (const item of res.value) {
          if (!existingUrls.has(item.sourceUrl)) {
            existingUrls.add(item.sourceUrl);
            newlyIngested.push(item);
          }
        }
      }
    }

    logs.push(`Gathering completed. Total new items ingested: ${newlyIngested.length}.`);
    return { newArticles: newlyIngested, logs };
  }
}

// Export singleton instance
export const feedManager = new FeedManager();
