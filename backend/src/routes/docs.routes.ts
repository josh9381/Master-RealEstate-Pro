/**
 * Documentation Routes — Phase 9.7d
 * Public endpoints for browsing documentation articles
 */
import { Router, Request, Response } from 'express'
import prisma from '../config/database'

const router = Router()

// ── List articles (with optional category/search) ───────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      page = '1',
      limit = '20',
    } = req.query

    const take = Math.min(parseInt(limit as string, 10) || 20, 100)
    const skip = ((parseInt(page as string, 10) || 1) - 1) * take

    const where: Record<string, unknown> = {
      isPublished: true,
      organizationId: null, // Only global/system articles
    }

    if (category) {
      where.category = category as string
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [(search as string).toLowerCase()] } },
      ]
    }

    const [articles, total] = await Promise.all([
      prisma.documentationArticle.findMany({
        where: where as any,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          tags: true,
          order: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
        take,
        skip,
      }),
      prisma.documentationArticle.count({ where: where as any }),
    ])

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: parseInt(page as string, 10) || 1,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    })
  } catch (error) {
    console.error('Error listing documentation:', error)
    res.status(500).json({ success: false, message: 'Failed to list articles' })
  }
})

// ── Get categories with article counts ──────────────────────────────────────
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.documentationArticle.groupBy({
      by: ['category'],
      where: { isPublished: true, organizationId: null },
      _count: { id: true },
      orderBy: { category: 'asc' },
    })

    res.json({
      success: true,
      data: categories.map(c => ({
        name: c.category,
        articleCount: c._count.id,
      })),
    })
  } catch (error) {
    console.error('Error fetching doc categories:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch categories' })
  }
})

// ── Get single article by slug ──────────────────────────────────────────────
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const article = await prisma.documentationArticle.findFirst({
      where: {
        slug: req.params.slug,
        isPublished: true,
        organizationId: null,
      },
    })

    if (!article) {
      res.status(404).json({ success: false, message: 'Article not found' })
      return
    }

    // Increment view count (fire-and-forget)
    prisma.documentationArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})

    res.json({ success: true, data: article })
  } catch (error) {
    console.error('Error fetching article:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch article' })
  }
})

export default router
