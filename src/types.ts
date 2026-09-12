export type CategoryId =
  | "all"
  | "ai-ml"
  | "web-dev"
  | "cloud-systems"
  | "cybersecurity"
  | "devops"
  | "mobile";

export type ContentSource = "Dev.to" | "Hacker News" | "arXiv";

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export interface Article {
  id: string;
  title: string;
  source: ContentSource;
  sourceUrl: string;
  author: string;
  publishedAt: string;
  category: CategoryId;
  categoryLabel: string;
  readTimeMinutes: number;
  difficulty: DifficultyLevel;
  summary: string;
  whyItMatters: string;
  keyTakeaways: string[];
  skillsExtracted: string[];
  tfidfKeywords?: { term: string; score: number }[];
  upvotes?: number;
  commentsCount?: number;
  isRead?: boolean;
  isBookmarked?: boolean;
  imageUrl?: string;
  contentType?: "News" | "Blogs" | "Research";
}

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  groundedKeyword?: string;
  keywordsCovered?: string[];
}

export interface ArticleQuiz {
  articleId: string;
  articleTitle: string;
  tfidfKeywords: { term: string; score: number }[];
  generatedAt: string;
  temperatureUsed: number;
  questions: QuizQuestion[];
}

export interface LearningMilestone {
  week: string;
  title: string;
  objectives: string[];
  practicalProject: string;
  interviewPrepTopics: string[];
}

export interface LearningPath {
  topic: string;
  targetRole: string;
  prerequisites: string[];
  milestones: LearningMilestone[];
  recommendedArticles?: string[];
  proofOfWorkProject?: {
    title: string;
    deliverables: string[];
    vivaPrepQuestions: { question: string; answer: string }[];
  };
}

export interface PipelineStepLog {
  step: number;
  toolName: string;
  name: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed";
  outputPreview?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface UserProfile {
  name: string;
  email: string;
  institution: string;
  program: string;
  batch: string;
  supervisor: string;
  selectedCategories: CategoryId[];
  readCount: number;
  quizzesTaken: number;
  averageQuizScore: number;
}

export interface VivaCard {
  id: string;
  topic: string;
  question: string;
  mentorIntent: string;
  studentAnswer: string;
  codeReference: string;
  tags: string[];
}
