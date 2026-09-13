import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Copy, Eye, EyeOff, Link2, LockKeyhole, MessageCircle, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { AdminFrame, LivePill } from "@/components/NotesShell";

export default function Settings() {
  const [comments, setComments] = useState(true);
  const [password, setPassword] = useState(false);
  const [active, setActive] = useState(true);
  const [toast, setToast] = useState("");
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  return (
    <AdminFrame eyebrow="空间管理" title="分享空间设置" action={<Link href="/admin" className="button button--ghost"><ArrowLeft size={16} />返回总览</Link>}>
      <div className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-card"><div className="settings-card__head"><div className="settings-card__icon settings-card__icon--link"><Link2 size={19} /></div><div><h2>分享链接</h2><p>拿到链接的家人可以查看这里的内容。</p></div><LivePill text={active ? "已开启" : "已暂停"} /></div><div className="share-url-box"><div><span>当前链接</span><strong>notes.example.com/share/lin-family</strong></div><button className="button button--secondary" onClick={() => flash("链接已复制")}><Copy size={15} />复制</button></div><div className="settings-row"><div><strong>允许访问</strong><span>{active ? "家人可以继续打开这个空间" : "链接暂时无法访问"}</span></div><button className="toggle-button" onClick={() => setActive(!active)} aria-label="切换链接状态">{active ? <ToggleRight size={31} /> : <ToggleLeft size={31} />}</button></div><button className="danger-link" onClick={() => flash("演示中不会真正重置链接")}><RefreshCw size={14} />重置分享链接</button></section>
          <section className="panel settings-card"><div className="settings-card__head"><div className="settings-card__icon settings-card__icon--lock"><LockKeyhole size={19} /></div><div><h2>访问保护</h2><p>给链接增加一层额外保护。</p></div></div><div className="settings-row settings-row--border"><div><strong>访问密码</strong><span>{password ? "打开链接时需要输入密码" : "目前无需密码，拿到链接即可查看"}</span></div><button className="toggle-button" onClick={() => setPassword(!password)} aria-label="切换访问密码">{password ? <ToggleRight size={31} /> : <ToggleLeft size={31} />}</button></div>{password && <div className="password-input"><input type="password" value="family-2026" readOnly /><button className="icon-button"><EyeOff size={16} /></button></div>}<div className="settings-row"><div><strong>链接有效期</strong><span>长期有效 · 你可以随时暂停</span></div><button className="text-link">修改</button></div></section>
          <section className="panel settings-card"><div className="settings-card__head"><div className="settings-card__icon settings-card__icon--chat"><MessageCircle size={19} /></div><div><h2>互动设置</h2><p>控制家人如何参与这个空间。</p></div></div><div className="settings-row"><div><strong>允许评论和回复</strong><span>家人可以在笔记下留言</span></div><button className="toggle-button" onClick={() => setComments(!comments)} aria-label="切换评论权限">{comments ? <ToggleRight size={31} /> : <ToggleLeft size={31} />}</button></div></section>
          <button className="delete-space"><Trash2 size={15} />归档这个空间</button>
        </div>
        <aside className="settings-side"><div className="settings-side__illustration"><ShieldCheck size={30} /><span>私密分享</span><strong>你始终掌握<br />谁能看到这里。</strong><p>我们不会把空间展示给搜索引擎，也不会公开你的图片。</p></div><div className="settings-side__tip"><span>小贴士</span><p>如果链接不小心发到了不合适的地方，可以随时重置链接。旧链接会立即失效。</p></div><Link href="/share/demo" className="button button--primary button--wide"><Eye size={16} />预览分享页面</Link></aside>
      </div>
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </AdminFrame>
  );
}
