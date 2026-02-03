# 🚀 Guide d'Intégration Next.js (Via API Sécurisée)

Ce guide explique comment afficher vos articles générés par l'IA sur votre site Next.js en utilisant l'API sécurisée de l'agent.

## 1. Variables d'Environnement

Dans votre projet Next.js (`.env.local`), ajoutez :

```bash
# URL de votre Agent IA sur Railway
AGENT_API_URL=https://agent-ia-post-production.up.railway.app

# Clé API Sécurisée (Doit correspondre à API_SECRET_KEY sur Railway)
AGENT_API_KEY=votre_cle_api_secrete_generee
```

## 2. Créer un Client API (`lib/api.ts`)

Créez un fichier pour centraliser les appels à l'API de l'agent :

```typescript
// lib/api.ts
import { Article } from '@/types/article';

const API_URL = process.env.AGENT_API_URL;
const API_KEY = process.env.AGENT_API_KEY;

if (!API_URL || !API_KEY) {
  throw new Error('AGENT_API_URL and AGENT_API_KEY must be defined');
}

/**
 * Récupérer tous les articles
 */
export async function getArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_URL}/api/articles`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache ISR (1 heure)
    });

    if (!res.ok) {
      console.error('Failed to fetch articles:', await res.text());
      return [];
    }

    const data = await res.json();
    return data.articles || [];
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

/**
 * Récupérer un article par son slug
 */
export async function getArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_URL}/api/articles/${slug}`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache ISR (1 heure)
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`Failed to fetch article ${slug}:`, await res.text());
      return null;
    }

    const data = await res.json();
    return data.article;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}
```

## 3. Définition des Types (`types/article.ts`)

```typescript
// types/article.ts
export interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string; // Markdown
  thumbnail_url: string; // URL Cloudinary
  published_at: string;
  metadata: {
    reading_time: number;
    social_post?: string;
    seo: {
      title: string;
      description: string;
      keywords: string[];
    };
    sources: {
      titre: string;
      url: string;
      date?: string;
    }[];
  };
}
```

## 4. Page Liste des Articles (`app/blog/page.tsx`)

```tsx
import { getArticles } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const metadata = {
  title: 'Blog - Agence Beauchoix',
  description: 'Nos derniers articles sur l\'IA, le No-Code et le développement SaaS.',
};

export default async function BlogIndex() {
  const articles = await getArticles();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-12 text-center">Nos Derniers Articles</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article) => (
          <Link href={`/blog/${article.slug}`} key={article.id} className="group">
            <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col">
              <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                {article.thumbnail_url ? (
                  <Image
                    src={article.thumbnail_url}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Pas d'image
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  {article.category}
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
                  <time dateTime={article.published_at}>
                    {format(new Date(article.published_at), 'd MMMM yyyy', { locale: fr })}
                  </time>
                  <span>•</span>
                  <span>{article.metadata.reading_time} min</span>
                </div>
                
                <h2 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {article.title}
                </h2>
                
                <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
                  {article.excerpt}
                </p>
                
                <span className="text-blue-600 font-medium text-sm inline-flex items-center mt-auto">
                  Lire l'article →
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

## 5. Page Détail Article (`app/blog/[slug]/page.tsx`)

```tsx
import { getArticle } from '@/lib/api';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Metadata } from 'next';

type Props = {
  params: { slug: string }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return {};

  return {
    title: article.metadata.seo.title,
    description: article.metadata.seo.description,
    keywords: article.metadata.seo.keywords,
    openGraph: {
      title: article.metadata.seo.title,
      description: article.metadata.seo.description,
      images: [article.thumbnail_url],
      type: 'article',
      publishedTime: article.published_at,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle(params.slug);
  
  if (!article) notFound();

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {article.category}
          </span>
          <span className="text-gray-500 text-sm">
            {format(new Date(article.published_at), 'd MMMM yyyy', { locale: fr })}
          </span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-extrabold mb-6 text-gray-900 leading-tight">
          {article.title}
        </h1>

        <div className="text-lg text-gray-600 max-w-2xl mx-auto italic border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 text-left">
          {article.excerpt}
        </div>
      </header>

      {/* Thumbnail */}
      {article.thumbnail_url && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-12 shadow-lg">
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content */}
      <div className="prose prose-lg prose-blue max-w-none mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <ReactMarkdown
          components={{
            // Style custom pour les liens dans le corps du texte
            a: ({node, ...props}) => (
              <a 
                {...props} 
                className="text-blue-600 font-medium hover:underline decoration-2 underline-offset-2 transition-all" 
                target="_blank" 
                rel="noopener noreferrer"
              />
            ),
            h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-16 mb-6 text-gray-800 border-b pb-4" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-2xl font-bold mt-10 mb-4 text-gray-800" {...props} />,
            img: ({node, ...props}) => (
              <div className="my-8 relative h-96 w-full rounded-xl overflow-hidden shadow-md">
                 <img {...props} className="object-cover w-full h-full" alt={props.alt || ''} />
              </div>
            ),
            blockquote: ({node, ...props}) => (
              <blockquote className="border-l-4 border-blue-600 pl-6 italic text-gray-700 bg-blue-50 py-4 pr-4 rounded-r-lg my-8" {...props} />
            ),
            ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 my-6 text-gray-700" {...props} />,
            li: ({node, ...props}) => <li className="pl-2" {...props} />,
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>

      {/* Social Share & Sources */}
      <div className="mt-12 grid md:grid-cols-2 gap-8">
        {/* Social Post */}
        {article.metadata.social_post && (
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🐦</span> Prêt à partager ?
            </h3>
            <div className="bg-white p-4 rounded-lg border border-gray-300 text-sm text-gray-600 italic whitespace-pre-wrap">
              {article.metadata.social_post}
            </div>
            <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              Copier pour LinkedIn / X
            </button>
          </div>
        )}

        {/* Sources */}
        {article.metadata.sources && article.metadata.sources.length > 0 && (
          <div className="p-6 bg-white rounded-2xl border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📚</span> Sources & Références
            </h3>
            <ul className="space-y-3">
              {article.metadata.sources.map((source, idx) => (
                <li key={idx} className="text-sm">
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-start gap-2"
                  >
                    <span className="text-gray-400 mt-0.5">↗</span>
                    <span>{source.titre}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
```
