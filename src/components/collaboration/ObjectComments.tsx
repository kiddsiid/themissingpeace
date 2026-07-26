import { addObjectComment, deleteObjectComment } from '@/app/(app)/collaboration/actions';

export interface ObjectCommentRow {
  id: string;
  body: string;
  author_id?: string | null;
  author_name?: string | null;
  created_at?: string | null;
}

export function ObjectComments({
  objectType,
  objectId,
  comments,
  currentUserId,
  returnPath,
}: {
  objectType: string;
  objectId: string;
  comments: ObjectCommentRow[];
  currentUserId: string;
  returnPath: string;
}) {
  return (
    <section className="mt-3 border-t border-[var(--line)] pt-3" aria-label="Comments">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--gold)]">Collaboration · {comments.length} comment{comments.length === 1 ? '' : 's'}</p>
      <ul className="mt-2 space-y-2">
        {comments.map((comment) => (
          <li key={comment.id} className="rounded-[10px] border border-[var(--line)] bg-[var(--pearl)] p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--ink)]">{comment.author_name || 'Collaborator'}</span>
              {comment.author_id === currentUserId && (
                <form action={deleteObjectComment}>
                  <input type="hidden" name="id" value={comment.id} />
                  <input type="hidden" name="return_path" value={returnPath} />
                  <button className="text-[10px] text-[var(--ink-faint)] hover:text-[var(--clay-ink)]">Delete</button>
                </form>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--ink-soft)]">{comment.body}</p>
          </li>
        ))}
      </ul>
      <form action={addObjectComment} className="mt-2 flex gap-2">
        <input type="hidden" name="object_type" value={objectType} />
        <input type="hidden" name="object_id" value={objectId} />
        <input type="hidden" name="return_path" value={returnPath} />
        <label className="sr-only" htmlFor={`comment-${objectId}`}>Add a comment</label>
        <input id={`comment-${objectId}`} name="body" required maxLength={2000} placeholder="Add a comment — never a Peace Note" className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs" />
        <button className="rounded-full bg-[var(--ink)] px-3 py-1.5 text-xs text-[var(--pearl)]">Comment</button>
      </form>
    </section>
  );
}
