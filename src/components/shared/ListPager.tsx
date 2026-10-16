import { Button } from '@/components/ui/button';

// Server-side pager for order lists: `total` is the backend's count of the
// whole filtered set, so the footer is honest about what exists beyond this page.
export function ListPager({ page, pages, total, onPage, isLoading }: {
  page: number; pages: number; total: number; onPage: (p: number) => void; isLoading?: boolean;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-sm">
      <span className="text-muted-foreground">{total.toLocaleString()} order{total === 1 ? '' : 's'}</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => onPage(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages || isLoading} onClick={() => onPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
