import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    price: z.string(),
    originalPrice: z.string().optional(),
    discount: z.string().optional(),
    affiliateUrl: z.string(),
    affiliatePlatform: z.enum(['shopee', 'amazon', 'aliexpress', 'shein', 'magalu', 'mercadolivre', 'outros']).default('shopee'),
    category: z.string(),
    badge: z.string().optional(),
    badgeColor: z.enum(['purple', 'pink', 'amber', 'emerald']).default('purple'),
    rating: z.number().min(1).max(5).default(5),
    reviewsCount: z.number().default(0),
    image: z.string(),
    featured: z.boolean().default(false),
    couponCode: z.string().optional(),
    couponDiscount: z.string().optional(),
    publishDate: z.string().or(z.date()),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { products };
