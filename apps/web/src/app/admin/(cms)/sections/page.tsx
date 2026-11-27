import { deleteCategoryAction, saveCategoryAction } from '@/app/admin/actions';
import { ActionForm } from '@/components/admin/action-form';
import { requireRole } from '@/server/auth/current-user';
import { listCategoriesWithCounts } from '@/server/content/taxonomy';

export const metadata = { title: 'Sections' };

export default async function SectionsPage() {
  await requireRole('admin', 'editor');
  const categories = await listCategoriesWithCounts();
  return (
    <div className="max-w-4xl">
      <h1 className="admin-h1">Sections</h1>
      <p className="admin-hint mt-2">
        Sections appear in the navigation in display order. A section with articles can’t be
        deleted.
      </p>
      <ul className="mt-6 flex flex-col gap-4">
        {categories.map((c) => (
          <li key={c.id} className="admin-panel">
            <details>
              <summary className="cursor-pointer flex flex-wrap items-baseline gap-3">
                <span className="font-headline text-xl">{c.name}</span>
                <span className="meta">
                  /section/{c.slug} · order {c.displayOrder} · {c.articleCount} articles
                </span>
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                <ActionForm action={saveCategoryAction} className="flex flex-col gap-3">
                  <input type="hidden" name="id" value={c.id} />
                  <CategoryFields values={c} />
                </ActionForm>
                {c.articleCount === 0 && (
                  <ActionForm
                    action={deleteCategoryAction}
                    submitLabel="Delete section"
                    danger
                    confirm={`Delete “${c.name}”?`}
                  >
                    <input type="hidden" name="id" value={c.id} />
                  </ActionForm>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
      <section className="mt-10">
        <h2 className="kicker !text-ink border-b-2 border-ink pb-2 mb-4">Add a section</h2>
        <ActionForm
          action={saveCategoryAction}
          submitLabel="Create section"
          className="flex flex-col gap-3 admin-panel"
        >
          <CategoryFields />
        </ActionForm>
      </section>
    </div>
  );
}

function CategoryFields({
  values,
}: {
  values?: { name: string; slug: string; description: string; displayOrder: number };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
      <label className="admin-label">
        Name
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={values?.name}
          className="admin-input"
        />
      </label>
      <label className="admin-label">
        Slug <span className="admin-hint">Blank = from name</span>
        <input
          name="slug"
          maxLength={120}
          defaultValue={values?.slug}
          className="admin-input !font-mono"
        />
      </label>
      <label className="admin-label">
        Order
        <input
          name="displayOrder"
          type="number"
          min={0}
          max={10000}
          defaultValue={values?.displayOrder ?? 100}
          className="admin-input"
        />
      </label>
      <label className="admin-label sm:col-span-3">
        Description
        <textarea
          name="description"
          maxLength={1000}
          rows={2}
          defaultValue={values?.description}
          className="admin-input"
        />
      </label>
    </div>
  );
}
