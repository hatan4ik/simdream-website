import { z } from 'zod';

/** The shape of a Wix Blog v3 post as `lib/wix/blog.ts` reads it. */
export const wixBlogPostSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    firstPublishedDate: z.string().optional(),
    lastPublishedDate: z.string().optional(),
    translationId: z.string().optional(),
    language: z.string().optional(),
    minutesToRead: z.number().optional(),
    media: z
      .object({
        wixMedia: z
          .object({
            image: z
              .object({
                id: z.string().optional(),
                url: z.string().optional(),
              })
              .loose()
              .optional(),
          })
          .loose()
          .optional(),
      })
      .loose()
      .optional(),
    richContent: z
      .object({
        nodes: z.array(z.record(z.string(), z.unknown())).optional(),
      })
      .loose()
      .optional(),
    seoData: z
      .object({
        tags: z
          .array(
            z
              .object({
                type: z.string().optional(),
                props: z.record(z.string(), z.unknown()).optional(),
                children: z.string().optional(),
              })
              .loose()
          )
          .optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .loose()
      .optional(),
  })
  .loose();

export type WixBlogPost = z.infer<typeof wixBlogPostSchema>;

export const queryBlogPostsResponseSchema = z
  .object({
    posts: z.array(wixBlogPostSchema).default([]),
    totalCount: z.number().optional(),
  })
  .loose();
