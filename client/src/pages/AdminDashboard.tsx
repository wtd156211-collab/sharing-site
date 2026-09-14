import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  FilePlus2,
  ImagePlus,
  Link2,
  MoreHorizontal,
  Send,
  Share2,
  StickyNote,
  Upload,
  X,
} from "lucide-react";
import { AdminFrame, activityItems, LivePill, samplePhotos, SectionTitle, SmallAvatar } from "@/components/NotesShell";
import ImageUploader from "@/components/ImageUploader";
import { Folder } from "@/components/Folder";

type NoteType = "text" | "image";
type Note = { id: number; type: NoteType; title: string; body: string; time: string; comments: number };

const initialNotes: Note[] = [
  { id: 1, type: "text", title: "今天把数学错题重新整理了一遍", body: "发现先画图再列式会清楚很多。晚上想再把第三题讲给妈妈听。", time: "今天 10:18", comments: 3 },
  { id: 2, type: "image", title: "周末的风很轻", body: "在窗边晒到了一点太阳。", time: "今天 09:42", comments: 1 },
];

const groupNotesByType = (notes: Note[]): Record<NoteType, Note[]> => ({
  text: notes.filter((note) => note.type === "text"),
  image: notes.filter((note) => note.type === "image"),
});

export default function AdminDashboard() {
  const [notes, setNotes] = useState(initialNotes);
  const [, setSelectedNote] = useState<Note | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<"text" | "image">("text");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const publish = () => {
    if (!draft.trim() && composerType === "text") return;
    setNotes((current) => [{ id: Date.now(), type: composerType, title: composerType === "text" ? "一条新的家庭笔记" : "刚刚上传的图片", body: draft || "图片已添加到空间。", time: "刚刚", comments: 0 }, ...current]);
    setDraft("");
    setComposerOpen(false);
    flash("笔记已发布，家人会实时看到更新");
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText("https://notes.example.com/share/lin-family"); } catch { /* prototype fallback */ }
    setCopied(true);
    flash("分享链接已复制");
    window.setTimeout(() => setCopied(false), 1800);
  };

  const noteGroups = [
    { type: "text" as const, label: "文字笔记" },
    { type: "image" as const, label: "图片笔记" },
  ];
  const grouped = groupNotesByType(notes);

  return (
    <AdminFrame eyebrow="星期日，9 月 13 日" title="早上好，小满" action={<Link href="/share/demo" className="button button--secondary"><Share2 size={16} />查看分享页<ArrowUpRight size={15} /></Link>}>
      <section className="overview-strip" aria-labelledby="overview-title">
        <div className="overview-strip__copy">
          <p className="section-kicker">今日概览</p>
          <h2 id="overview-title">把想说的话，留在这里。</h2>
          <p>记录一段文字或一张图片，家人会在分享空间里看到。</p>
        </div>
        <div className="overview-strip__status">
          <LivePill text="空间正常" />
          <span>最近更新：等待数据</span>
          <button className="button button--primary" onClick={() => { setComposerType("text"); setComposerOpen(true); }}><FilePlus2 size={16} />新建笔记</button>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <article className="panel quick-compose-panel">
          <div className="panel__header"><SectionTitle icon={FilePlus2} label="写下此刻" meta="随时记录" /><span className="panel__spark">✦</span></div>
          <p className="panel__hint">记录今天的心情、进度，或者一张随手拍。</p>
          <div className="compose-options">
            <button className="compose-option" onClick={() => { setComposerType("text"); setComposerOpen(true); }}><span className="compose-option__icon compose-option__icon--ink"><StickyNote size={20} /></span><span><strong>写一条笔记</strong><small>输入文字和想法</small></span><ChevronRight size={17} /></button>
            <button className="compose-option" onClick={() => { setComposerType("image"); setComposerOpen(true); }}><span className="compose-option__icon compose-option__icon--peach"><ImagePlus size={20} /></span><span><strong>上传图片</strong><small>支持 JPG、PNG、WEBP</small></span><ChevronRight size={17} /></button>
          </div>
          <button className="upload-dropzone" onClick={() => { setComposerType("image"); setComposerOpen(true); }}><Upload size={17} /><span>也可以把图片拖到这里</span></button>
        </article>

        <article className="panel share-panel">
          <div className="panel__header"><SectionTitle icon={Link2} label="家庭分享空间" meta="已开启" /><LivePill /></div>
          <div className="share-panel__link"><div className="share-panel__link-icon"><Share2 size={19} /></div><div><strong>lin-family</strong><span>notes.example.com/share/lin-family</span></div><button className="round-button" onClick={copyLink} aria-label="复制链接">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
          <div className="share-panel__footer"><div className="people-stack"><SmallAvatar name="妈" tone="green" /><SmallAvatar name="爸" tone="blue" /><SmallAvatar name="妹" tone="orange" /><span>+1</span></div><span>4 位家人可以查看</span><Link href="/admin/settings" className="text-link">管理设置</Link></div>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="panel notes-panel">
          <div className="panel__header"><SectionTitle icon={StickyNote} label="最近笔记" meta={`${notes.length} 条刚刚更新`} /><button className="icon-button"><MoreHorizontal size={18} /></button></div>
           <div className="note-folders">
             {noteGroups.map(({ type, label }) => (
               <div className="note-folder" key={type}>
                 <div className="note-folder__header"><strong>{label}</strong><span>{grouped[type].length} 条</span></div>
                 <Folder
                   color={type === "text" ? "blue" : "white"}
                   size="sm"
                   cards={grouped[type].slice(0, 3).map((note) => ({ id: note.id, title: note.title, onClick: () => setSelectedNote(note) }))}
                   onCardClick={(card) => { const note = grouped[type].find((item) => item.id === card.id); if (note) setSelectedNote(note); }}
                 />
               </div>
             ))}
           </div>
          <Link href="/share/demo" className="panel__footer-link">查看全部笔记 <ArrowUpRight size={14} /></Link>
        </article>

        <article className="panel activity-panel">
          <div className="panel__header"><SectionTitle icon={Clock3} label="最近动态" meta="实时" /><LivePill text="在线" /></div>
          <div className="activity-list">{activityItems.map((item) => { const Icon = item.icon; return <div className="activity-row" key={item.name + item.time}><SmallAvatar name={item.name} tone={item.tone} /><div><p><strong>{item.name}</strong>{item.action}</p><span><Icon size={13} />{item.time}</span></div></div>; })}</div>
          <div className="activity-callout"><span className="activity-callout__icon"><Send size={15} /></span><p>有新的家人回复时<br /><strong>你会在这里看到</strong></p><button className="round-button round-button--small"><ChevronRight size={15} /></button></div>
        </article>
      </section>

      <section className="panel photo-panel">
        <div className="panel__header"><SectionTitle icon={ImagePlus} label="图片记忆" meta="最近上传" /><button className="text-link">打开相册 <ArrowUpRight size={13} /></button></div>
        <div className="photo-grid">{samplePhotos.map((photo) => <div className="photo-tile" key={photo.id}><div className={`photo-placeholder ${photo.gradient}`}><span className="photo-placeholder__label">{photo.id === 1 ? "SAT" : photo.id === 2 ? "SUN" : "DINNER"}</span></div><strong>{photo.title}</strong><span>{photo.subtitle}</span></div>)}</div>
      </section>

      {composerOpen && <div className="modal-backdrop" role="presentation"><div className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title"><div className="composer-modal__header"><div><p className="eyebrow">新内容</p><h2 id="composer-title">{composerType === "text" ? "写一条家庭笔记" : "添加一张图片"}</h2></div><button className="icon-button" onClick={() => setComposerOpen(false)} aria-label="关闭"><X size={18} /></button></div><div className="composer-tabs"><button className={composerType === "text" ? "is-active" : ""} onClick={() => setComposerType("text")}><StickyNote size={15} />文字笔记</button><button className={composerType === "image" ? "is-active" : ""} onClick={() => setComposerType("image")}><ImagePlus size={15} />图片</button></div>{composerType === "text" ? <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="今天想和家人分享什么？" className="note-textarea" /> : <ImageUploader />}<div className="composer-modal__footer"><span><Check size={14} />自动保存草稿</span><div><button className="button button--ghost" onClick={() => setComposerOpen(false)}>取消</button><button className="button button--primary" onClick={publish}><Send size={15} />发布内容</button></div></div></div></div>}
       {toast && <div className="toast" role="status" aria-live="polite"><Check size={16} />{toast}</div>}
    </AdminFrame>
  );
}
