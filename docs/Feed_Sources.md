# DevLens — Feed Sources

> Research compiled for the DevLens backend RSS/API aggregator.
> All sources below are **free and require no API key** (unless noted).

---

## ❌ daily.dev API — Not Viable

- **Limit**: 200 requests/month (~6/day) — far too low for a feed aggregator
- **Purpose**: Designed for personal AI assistant integrations, not content syndication
- **ToS**: Scraping their internal API without permission is against ToS
- **Verdict**: Skip it. The open RSS sources below are far more practical.

---

## ✅ Recommended Sources Per Category

### 🌐 Web Development
| Source | Endpoint | Type | Auth |
|---|---|---|---|
| Dev.to | `https://dev.to/api/articles?tag=webdev` | REST API | No |
| CSS-Tricks | `https://css-tricks.com/feed/` | RSS | No |
| web.dev (Google Chrome) | `https://web.dev/feed.xml` | RSS | No |
| Smashing Magazine | `https://www.smashingmagazine.com/feed` | RSS | No |
| MDN Blog | `https://developer.mozilla.org/en-US/blog/rss.xml` | RSS | No |

**Recommended**: Dev.to API + CSS-Tricks + web.dev

---

### 🤖 Artificial Intelligence
| Source | Endpoint | Type | Auth |
|---|---|---|---|
| arXiv cs.AI | `http://export.arxiv.org/rss/cs.AI` | RSS | No |
| Hugging Face Blog | `https://huggingface.co/blog/feed.xml` | RSS | No |
| Papers With Code | `https://paperswithcode.com/rss` | RSS | No |
| OpenAI Blog | `https://openai.com/blog/rss.xml` | RSS | No |
| Google AI Blog | `https://blog.research.google/atom.xml` | Atom | No |

**Recommended**: arXiv cs.AI + Hugging Face Blog + OpenAI Blog

---

### 📊 Data Science
| Source | Endpoint | Type | Auth |
|---|---|---|---|
| Towards Data Science | `https://towardsdatascience.com/feed` | RSS | No |
| KDnuggets | `https://www.kdnuggets.com/feed` | RSS | No |
| arXiv cs.LG (ML) | `http://export.arxiv.org/rss/cs.LG` | RSS | No |
| Kaggle Blog | `https://medium.com/feed/kaggle-blog` | RSS | No |
| Data Science Central | `https://www.datasciencecentral.com/feed/` | RSS | No |

**Recommended**: Towards Data Science + KDnuggets + arXiv cs.LG

---

### 🔐 Cyber Security
| Source | Endpoint | Type | Auth |
|---|---|---|---|
| The Hacker News | `https://feeds.feedburner.com/TheHackersNews` | RSS | No |
| Krebs on Security | `https://krebsonsecurity.com/feed/` | RSS | No |
| Bleeping Computer | `https://www.bleepingcomputer.com/feed/` | RSS | No |
| SANS ISC | `https://isc.sans.edu/rssfeed.xml` | RSS | No |
| NVD CVEs (NIST) | `https://services.nvd.nist.gov/rest/json/cves/2.0` | REST API | Optional (higher limits with key) |

**Recommended**: The Hacker News + Bleeping Computer + SANS ISC

---

### ☁️ Cloud Computing
| Source | Endpoint | Type | Auth |
|---|---|---|---|
| AWS News Blog | `https://aws.amazon.com/blogs/aws/feed/` | RSS | No |
| Google Cloud Blog | `https://cloudblog.withgoogle.com/rss/` | RSS | No |
| Azure Blog | `https://azurecomcdn.azureedge.net/en-us/blog/feed/` | RSS | No |
| InfoQ Cloud | `https://feed.infoq.com/Cloud/news` | RSS | No |
| Cloudflare Blog | `https://blog.cloudflare.com/rss/` | RSS | No |

**Recommended**: AWS Blog + Google Cloud Blog + InfoQ Cloud

---

### ⚙️ DevOps
| Source | Endpoint | Type | Auth |
|---|---|---|---|
| The New Stack | `https://thenewstack.io/feed/` | RSS | No |
| DevOps.com | `https://devops.com/feed/` | RSS | No |
| CNCF Blog | `https://www.cncf.io/blog/feed/` | RSS | No |
| HashiCorp Blog | `https://www.hashicorp.com/blog/feed.xml` | RSS | No |
| Docker Blog | `https://www.docker.com/blog/feed/` | RSS | No |

**Recommended**: The New Stack + CNCF Blog + Docker Blog

---

## Implementation Notes

- **Parsing**: Use `feedparser` (Python) to parse all RSS/Atom feeds — single library handles all formats
- **Schedule**: Fetch each source every 30–60 minutes via a background scheduler (`APScheduler` or FastAPI lifespan)
- **Deduplication**: Hash article URL to avoid storing duplicates
- **Storage**: SQLite locally, PostgreSQL in production (one `.env` change)
- **Dev.to**: Use the REST API with `?tag=webdev&per_page=20` — no key needed for reads
- **arXiv**: Throttle to 1 request/3 seconds per arXiv's rate limit policy
