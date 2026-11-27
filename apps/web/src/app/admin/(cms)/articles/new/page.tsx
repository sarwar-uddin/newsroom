import { ArticleForm } from '@/components/admin/article-form';
import { EMPTY_DOC } from '@/lib/rich-text/schema';
import { requireUser } from '@/server/auth/current-user';
import { getEditorOptions } from '@/server/content/editorial';
import { availableIntents, canChooseAnyByline, canSetFeatured } from '@/server/content/workflow';

export const metadata = { title: 'New article' };

export default async function NewArticlePage() {
  const user = await requireUser();
  const options = await getEditorOptions();
  const draft = { status: 'draft' as const, createdBy: user.id };
  const chooseByline = canChooseAnyByline(user);

  if (!chooseByline && !user.authorId) {
    return (
      <div className="max-w-2xl">
        <h1 className="admin-h1">New article</h1>
        <p className="mt-6 border-l-4 border-accent bg-paper-deep px-3 py-2">
          Your account has no byline yet. Ask an editor to link one before writing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-h1 mb-6">New article</h1>
      <ArticleForm
        initial={{
          status: 'draft',
          title: '',
          slug: '',
          dek: '',
          excerpt: '',
          body: EMPTY_DOC,
          authorId: chooseByline ? (user.authorId ?? '') : (user.authorId ?? ''),
          categoryId: '',
          tags: '',
          featuredImage: null,
          imageCaption: '',
          imageCredit: '',
          seoTitle: '',
          seoDescription: '',
          featured: false,
        }}
        intents={availableIntents(user, draft).filter((i) =>
          ['save', 'submit', 'publish'].includes(i),
        )}
        options={{ ...options, media: options.recentMedia }}
        permissions={{ chooseByline, setFeatured: canSetFeatured(user), editable: true }}
      />
    </div>
  );
}
