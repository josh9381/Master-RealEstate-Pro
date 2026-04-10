import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Book, Search, ChevronRight, Clock, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { docsApi } from '@/lib/api';

interface DocArticle {
  id: string;
  title: string;
  slug: string;
  content?: string;
  category: string;
  tags: string[];
  order: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DocCategory {
  name: string;
  articleCount: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Getting Started': '\u{1F680}',
  'Features & Tools': '\u{1F527}',
  'Integration Guides': '\u{1F50C}',
  'API Reference': '\u{1F4BB}',
  'Best Practices': '\u2B50',
  'Troubleshooting': '\u{1F50D}',
};

const DocumentationPages = () => {
  const [view, setView] = useState<'home' | 'category' | 'article'>('home');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch categories
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['doc-categories'],
    queryFn: () => docsApi.getCategories(),
  });

  // Fetch articles (for category or search)
  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['doc-articles', selectedCategory, search, page],
    queryFn: () => docsApi.list({
      ...(selectedCategory && { category: selectedCategory }),
      ...(search && { search }),
      page,
      limit: 20,
    }),
    enabled: view === 'category' || !!search,
  });

  // Fetch single article
  const { data: articleData, isLoading: articleLoading } = useQuery({
    queryKey: ['doc-article', selectedSlug],
    queryFn: () => docsApi.getBySlug(selectedSlug),
    enabled: view === 'article' && !!selectedSlug,
  });

  const categories: DocCategory[] = catData?.data ?? [];
  const articles: DocArticle[] = articlesData?.data?.articles ?? [];
  const pagination = articlesData?.data?.pagination;
  const article: DocArticle | null = articleData?.data ?? null;
  const totalArticles = categories.reduce((sum, c) => sum + c.articleCount, 0);

  const openCategory = (name: string) => {
    setSelectedCategory(name);
    setSearch('');
    setPage(1);
    setView('category');
  };

  const openArticle = (slug: string) => {
    setSelectedSlug(slug);
    setView('article');
  };

  const goHome = () => {
    setView('home');
    setSelectedCategory('');
    setSelectedSlug('');
    setSearch('');
    setPage(1);
  };

  // ── Article view ─────────────────────────────────────────────────────────
  if (view === 'article' && articleLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'article' && article) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setView(selectedCategory ? 'category' : 'home')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <Badge variant="outline">{article.category}</Badge>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {new Date(article.updatedAt).toLocaleDateString()}
            </span>
            <span>{article.viewCount.toLocaleString()} views</span>
            {article.tags.length > 0 && (
              <div className="flex gap-1">
                {article.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap">{article.content}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Category / search results view ───────────────────────────────────────
  if (view === 'category') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={goHome}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Categories
          </Button>
          <h1 className="text-2xl font-bold">{selectedCategory || 'Search Results'}</h1>
        </div>

        {articlesLoading ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">Loading articles...</CardContent>
          </Card>
        ) : articles.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No articles found in this category.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {articles.map((art) => (
              <Card key={art.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openArticle(art.slug)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticle(art.slug) } }}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{art.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="secondary">{art.category}</Badge>
                        <span>{art.viewCount.toLocaleString()} views</span>
                        <span>Updated {new Date(art.updatedAt).toLocaleDateString()}</span>
                        {art.tags.length > 0 && art.tags.slice(0, 3).map(t => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    );
  }

  // ── Home view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive guides and resources to help you succeed
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  setSelectedCategory('');
                  setPage(1);
                  setView('category');
                }
              }}
            />
          </div>
          {search.trim() && (
            <div className="mt-3">
              <Button size="sm" onClick={() => { setSelectedCategory(''); setPage(1); setView('category'); }}>
                Search for &ldquo;{search}&rdquo;
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Topic areas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">Content regularly refreshed</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        {catLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><div className="flex items-start space-x-3"><div className="h-8 w-8 bg-muted animate-pulse rounded" /><div className="space-y-2 flex-1"><div className="h-4 bg-muted animate-pulse rounded w-28" /><div className="h-3 bg-muted animate-pulse rounded w-16" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Book className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p>No documentation articles have been published yet.</p>
              <p className="text-sm mt-1">Check back soon for guides and resources.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat.name} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openCategory(cat.name)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCategory(cat.name) } }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{CATEGORY_ICONS[cat.name] || '\u{1F4C4}'}</div>
                      <div>
                        <h3 className="font-semibold mb-1">{cat.name}</h3>
                        <p className="text-xs text-primary">{cat.articleCount} articles</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Book className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground">Can&apos;t find what you&apos;re looking for?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Our support team is here to help. Submit a support ticket and we&apos;ll get back to you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentationPages;
