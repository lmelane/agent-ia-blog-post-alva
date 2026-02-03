# 🚀 Guide d'Intégration Next.js (App Router)

Voici comment afficher vos articles générés par l'IA sur votre site Next.js.
L'architecture est simple : Next.js se connecte directement à votre base de données PostgreSQL (Railway) pour récupérer le contenu en temps réel.

## 1. Installation des dépendances

Dans votre projet Next.js :

```bash
npm install pg gray-matter react-markdown lucide-react date-fns
npm install -D @types/pg
```

## 2. Configuration de la Base de Données

Créez un fichier `lib/db.ts` pour gérer la connexion (Singleton pattern pour éviter de saturer les connexions en dev).

```typescript
// lib/db.ts
import { Pool } from 'pg';

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const conn = globalForDb.conn ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Nécessaire pour Railway/Prod
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = conn;
```

N'oubliez pas d'ajouter `DATABASE_URL` dans votre `.env.local` Next.js (la même que pour l'agent).

## 3. Définition des Types

Créez `types/article.ts` :

```typescript
// types/article.ts
export interface Article {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  thumbnail_url: string; // ex: "/images/mon-article.png"
  published_at: Date;
  metadata: {
    reading_time: number;
    social_post?: string; // Le fameux post LinkedIn généré
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

## 4. Page : Liste des Articles (/blog)

Créez `app/blog/page.tsx` :

```tsx
import { db } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Revalidate toutes les heures (ISR)
export const revalidate = 3600;

async function getArticles() {
  const res = await db.query(`
    SELECT a.*, c.name as category 
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.published_at IS NOT NULL
    ORDER BY a.published_at DESC
  `);
  return res.rows;
}

export default async function BlogIndex() {
  const articles = await getArticles();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-12 text-center">Nos Derniers Articles</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article) => (
          <Link href={`/blog/${article.slug}`} key={article.id} className="group">
            <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="relative h-48 w-full overflow-hidden">
                {article.thumbnail_url ? (
                  <Image
                    src={article.thumbnail_url}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">Pas d'image</div>
                )}
                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {article.category}
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center text-sm text-gray-500 mb-3 space-x-2">
                  <span>{format(new Date(article.published_at), 'd MMMM yyyy', { locale: fr })}</span>
                  <span>•</span>
                  <span>{article.metadata.reading_time} min de lecture</span>
                </div>
                
                <h2 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {article.title}
                </h2>
                
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {article.excerpt}
                </p>
                
                <span className="text-blue-600 font-medium text-sm inline-flex items-center">
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

## 5. Page : Article Détail (/blog/[slug])

Créez `app/blog/[slug]/page.tsx`. C'est là que la magie opère.

```tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Metadata } from 'next';

// Génération des métadonnées SEO dynamiques
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return {};

  return {
    title: article.metadata.seo.title,
    description: article.metadata.seo.description,
    keywords: article.metadata.seo.keywords,
    openGraph: {
      images: [article.thumbnail_url],
    },
  };
}

async function getArticle(slug: string) {
  const res = await db.query(`
    SELECT a.*, c.name as category 
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.slug = $1
  `, [slug]);
  
  return res.rows[0];
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
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
        
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-900 leading-tight">
          {article.title}
        </h1>

        <div className="text-lg text-gray-600 max-w-2xl mx-auto italic">
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
            // Custom styles pour les éléments Markdown si besoin
            h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-800" {...props} />,
            img: ({node, ...props}) => (
              <div className="my-8 relative h-96 w-full rounded-xl overflow-hidden">
                 {/* Gestion des images dans le markdown si nécessaire */}
                 <img {...props} className="object-cover w-full h-full" />
              </div>
            )
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>

      {/* Sources & Social Share */}
      <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4">📢 Partager cet article (Texte prêt à l'emploi)</h3>
        <div className="bg-white p-4 rounded-lg border border-gray-300 text-sm text-gray-600 italic">
          {article.metadata.social_post || "Génération du post en cours..."}
        </div>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Copier pour LinkedIn
        </button>
      </div>
    </article>
  );
}
```

## ⚠️ Point Critique : Les Images

Vos articles référencent des images (ex: `/images/mon-image.png`).
Pour que Next.js puisse les afficher, elles doivent être accessibles.

### Solution Recommandée (Volume Partagé)
Si votre Agent et votre site Next.js sont hébergés au même endroit (ex: VPS, Railway), assurez-vous que le dossier où l'agent écrit les images est **monté** en tant que dossier `public/images` dans votre application Next.js.

### Solution Alternative (S3 - Recommandé pour la Prod)
Modifier l'agent `Thumbnail` pour qu'il upload directement sur AWS S3 ou Cloudinary et stocke l'URL absolue (`https://s3...`) dans la BDD au lieu du chemin local. C'est plus robuste si vous séparez le frontend du backend.
