import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useRoute } from "wouter";
import { ArrowUpRight, BookOpen, Check, LockKeyhole, MessageCircle, MoreHorizontal, Send, Share2, Smile, Wifi, X } from "lucide-react";
import { LivePill, SmallAvatar } from "@/components/NotesShell";
import { ApiError, api, type ShareSpace as ShareSpaceMeta } from "@/lib/api";
import ShareAccess from "./ShareAccess";
import { useSpaceEvents } from "@/hooks/useSpaceEvents";

type Comment = { name: string; tone: "green" | "blue" | "orange" | "purple"; text: string; time: string };
const initialComments: Comment[] = [
  { name: "妈妈", tone: "green", text: "画得很清楚，晚上回来听你讲。", time: "8 分钟前" },
  { name: "爸爸", tone: "blue", text: "加油，第三题一定没问题。", time: "3 分钟前" },
];

export default function ShareSpace() {
  const [, params] = useRoute<{ token: string }>("/share/:token");
  const token = params?.token ?? "";
  const realtime = useSpaceEvents(token.length >= 43 ? token : undefined);
  const [space, setSpace] = useState<ShareSpaceMeta | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentDraft, setCommentDraft] = useState("");
  const [showNew, setShowNew] = useState(true);
  const [toast, setToast] = useState("");

  const loadSpace = async () => {
    if (!token) return;
    setLoadError("");
    try {
      const result = await api.share.getSpace(token);
      setSpace(result.space);
      setNeedsPassword(false);
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "PASSWORD_REQUIRED") {
        setNeedsPassword(true);
        return;
      }
      setLoadError("这个分享链接暂时无法访问。");
    }
  };

  useEffect(() => { void loadSpace(); }, [token]);

  useEffect(() => {
    if (!token) return;
    void api.share.listComments(token).then(({ comments: remoteComments }) => {
      if (!remoteComments.length) return;
      setComments(remoteComments.map((comment, index) => ({
        name: String(comment.nickname ?? "家人"),
        tone: (["green", "blue", "orange", "purple"] as const)[index % 4],
        text: String(comment.content ?? ""),
        time: comment.createdAt ? new Date(String(comment.createdAt)).toLocaleString() : "刚刚",
      })));
    }).catch(() => { /* keep the local shell while the API is unavailable */ });
  }, [token]);

  if (needsPassword) return <ShareAccess token={token} onUnlocked={() => void loadSpace()} />;
  if (loadError) return <main className="share-page share-page--access"><section className="share-access-card"><p className="eyebrow">分享链接</p><h1>暂时无法访问</h1><p>{loadError}</p><Link href="/admin" className="button button--secondary">返回管理端</Link></section></main>;
  const addComment = async () => {
    if (!commentDraft.trim()) return;
    const content = commentDraft.trim();
    if (token.length >= 43) {
      try {
        await api.share.createComment(token, { nickname: "我", content });
      } catch {
        setToast("评论发送失败，请稍后重试"); window.setTimeout(() => setToast(""), 2200);
        return;
      }
    }
    setComments((current) => [...current, { name: "我", tone: "orange", text: content, time: "刚刚" }]);
    setCommentDraft(""); setToast("评论已发送"); window.setTimeout(() => setToast(""), 2200);
  };
  return (
    <div className="share-page">
      <header className="share-header"><div className="share-header__inner"><Link href="/admin" className="share-brand"><span className="share-brand__symbol"><BookOpen size={17} /></span><span>拾光笔记</span></Link><div className="share-header__meta"><LivePill text={realtime.status === "open" ? "实时更新" : "重新连接中"} /><button className="share-header__button"><Share2 size={16} />分享</button><button className="share-header__more"><MoreHorizontal size={19} /></button></div></div></header>
      <main className="share-main">
        <div className="share-intro"><div className="share-intro__eyebrow"><span className="share-intro__line" />家庭分享空间 <span className="share-intro__line" /></div><h1>{space?.name ?? "家庭的"}<br /><em>日常记录</em></h1><p>{space?.description ?? "这里放着一些想和家人分享的片段。"}<br />谢谢你来看。</p><div className="share-intro__bottom"><span>{space?.lastActivityAt ? `更新于 ${new Date(space.lastActivityAt).toLocaleString()}` : "等待第一次更新"}</span><span className="share-intro__lock"><LockKeyhole size={13} />仅限持链接的家人查看</span></div></div>
        {showNew && <div className="new-update-banner" role="status" aria-live="polite"><span className="new-update-banner__pulse" /><span>刚刚有 {Math.max(1, realtime.unreadCount)} 条新内容</span><button onClick={() => setShowNew(false)}>查看更新 <ArrowUpRight size={14} /></button><button className="new-update-banner__close" onClick={() => setShowNew(false)} aria-label="关闭"><X size={15} /></button></div>}
        <div className="share-timeline"><div className="timeline-date"><span>今天 · 9 月 13 日</span><i /></div><article className="share-entry share-entry--featured"><div className="share-entry__rail"><SmallAvatar name="妹" tone="orange" /><span className="timeline-line" /></div><div className="share-entry__content"><div className="entry-meta"><strong>妹妹</strong><span>10:18</span><span className="entry-tag">文字笔记</span></div><h2>今天把数学错题重新整理了一遍</h2><p>发现先画图再列式会清楚很多。晚上想再把第三题讲给妈妈听。</p><div className="entry-note-paper"><div className="entry-note-paper__top"><span>今天的一个小发现</span><span>家庭笔记</span></div><div className="entry-note-paper__equation">先画图<br /><b>↓</b><br />再列式</div><div className="entry-note-paper__scribble">慢慢来，<br />会更清楚。</div></div><div className="entry-actions"><button><MessageCircle size={15} />{comments.length} 条对话</button><button><Smile size={15} />送一个鼓励</button></div><div className="comments-thread">{comments.map((comment) => <div className="comment-row" key={comment.name + comment.time}><SmallAvatar name={comment.name} tone={comment.tone} /><div><p><strong>{comment.name}</strong>{comment.text}</p><span>{comment.time}</span></div></div>)}</div><div className="comment-composer"><SmallAvatar name="我" tone="orange" /><label className="sr-only" htmlFor="comment-input">写一句回复</label><input id="comment-input" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addComment()} placeholder="写一句回复..." /><button onClick={addComment} aria-label="发送评论"><Send size={16} /></button></div></div></article><article className="share-entry"><div className="share-entry__rail"><SmallAvatar name="妹" tone="orange" /><span className="timeline-line" /></div><div className="share-entry__content"><div className="entry-meta"><strong>妹妹</strong><span>09:42</span><span className="entry-tag entry-tag--peach">图片笔记</span></div><h2>周末的风很轻</h2><p>在窗边晒到了一点太阳。</p><div className="share-image-placeholder"><span>WEEKEND<br /><b>09.13</b></span><div className="share-image-placeholder__sun" /></div><div className="entry-actions"><button><MessageCircle size={15} />1 条对话</button><button><Smile size={15} />送一个鼓励</button></div></div></article></div>
        <div className="share-footer-note"><span className="share-footer-note__icon"><Wifi size={15} /></span><p>这个页面会自动更新<br /><strong>不用反复刷新</strong></p></div>
      </main>
      <footer className="share-footer"><div className="share-footer__inner"><div><span className="share-footer__small">A PRIVATE SPACE FOR</span><strong>小满 & 家人</strong></div><Link href="/admin" className="share-footer__admin">我是空间管理员 <ArrowUpRight size={14} /></Link></div></footer>
      {toast && <div className="toast" role="status" aria-live="polite"><Check size={16} />{toast}</div>}
    </div>
  );
}
