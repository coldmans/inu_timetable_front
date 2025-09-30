import React, { useState } from 'react';
import { MessageCircle, RefreshCcw, Send, ThumbsUp, Tag, AlertCircle, Loader2, User, Clock, Hash } from 'lucide-react';

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return date.toLocaleString();
};

const CommunityBoard = ({
  posts = [],
  isLoading,
  error,
  canPost,
  onCreatePost,
  onRefresh,
  onToggleLike,
  likedPostMap = {},
}) => {
  const [formState, setFormState] = useState({ title: '', content: '', tags: '' });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onCreatePost || isSubmitting) return;

    const title = formState.title.trim();
    const content = formState.content.trim();

    if (!title || !content) {
      setFormError('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await onCreatePost({
        title,
        content,
        tags: formState.tags,
      });
      setFormState({ title: '', content: '', tags: '' });
    } catch (submissionError) {
      setFormError(submissionError.message || '게시글을 등록하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPosts = posts && posts.length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">커뮤니티 게시판</h2>
            <p className="text-xs text-slate-500">수강 정보, 스터디 모집, 시험 후기 등을 자유롭게 나눠보세요.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} /> 새로고침
        </button>
      </div>

      <div className="grid gap-8 px-6 py-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((key) => (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="h-5 w-32 rounded bg-slate-200/80 animate-pulse" />
                  <div className="mt-3 h-4 w-full rounded bg-slate-200/70 animate-pulse" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-slate-200/60 animate-pulse" />
                </div>
              ))}
            </div>
          ) : hasPosts ? (
            posts.map(post => {
              const liked = Boolean(likedPostMap[post.id]);
              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{post.content}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User size={14} />
                          <span>
                            {post.author}
                            {post.major ? ` · ${post.major}` : ''}
                            {post.grade ? ` ${post.grade}학년` : ''}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatDateTime(post.createdAt)}</span>
                        </span>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {post.tags.map(tag => (
                            <span key={`${post.id}-${tag}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                              <Hash size={12} className="text-slate-400" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {onToggleLike && (
                      <button
                        type="button"
                        onClick={() => onToggleLike(post)}
                        className={`flex flex-col items-center gap-1 rounded-full border px-2 py-2 text-xs font-medium transition-colors ${liked ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600'}`}
                        aria-pressed={liked}
                      >
                        <ThumbsUp size={16} className={liked ? 'text-blue-600' : 'text-current'} />
                        <span>{Number(post.likes ?? 0).toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
              아직 작성된 게시글이 없어요. 첫 글의 주인공이 되어 보세요!
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-600">
              <Tag size={16} />
              <span className="text-sm font-semibold">새 게시글 작성</span>
            </div>
            {canPost ? (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="title"
                  value={formState.title}
                  onChange={handleChange}
                  placeholder="제목을 입력해 주세요"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  name="content"
                  value={formState.content}
                  onChange={handleChange}
                  placeholder="공개할 내용을 적어 주세요 (예: 시험 후기, 수강 정보, 스터디 모집 등)"
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  name="tags"
                  value={formState.tags}
                  onChange={handleChange}
                  placeholder={'태그 (쉼표 또는 #로 구분) 예: 스터디,전핵'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formError && (
                  <div className="flex items-center gap-1 text-xs text-rose-500">
                    <AlertCircle size={14} />
                    <span>{formError}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      등록하기
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                게시글을 작성하려면 로그인이 필요해요. 오른쪽 상단의 로그인 버튼을 눌러주세요.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CommunityBoard;
