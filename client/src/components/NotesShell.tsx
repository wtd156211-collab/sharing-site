import { Link, useLocation } from "wouter";
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark">
      <div className="brand-mark__symbol"><BookOpen size={18} strokeWidth={2.2} /></div>
      {!compact && (
        <div className="brand-mark__copy">
          <span className="brand-mark__name">拾光笔记</span>
          <span className="brand-mark__sub">FAMILY NOTES</span>
        </div>
      )}
    </div>
  );
}

const navItems = [
  { href: "/admin", label: "总览", icon: Home },
  { href: "/admin", label: "我的空间", icon: FolderOpen },
  { href: "/share/demo", label: "分享预览", icon: Share2 },
];

export function SideRail() {
  const [location] = useLocation();
  return (
    <aside className="side-rail">
      <div className="side-rail__top"><BrandMark /></div>
      <nav className="side-nav" aria-label="主导航">
        <p className="side-nav__label">工作区</p>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = index === 0 ? location === "/" || location === "/admin" : location === item.href;
          return (
            <Link className={`side-nav__item ${active ? "is-active" : ""}`} href={item.href} key={`${item.label}-${index}`}>
              <Icon size={17} />
              <span>{item.label}</span>
              {item.label === "我的空间" && <span className="side-nav__count">2</span>}
            </Link>
          );
        })}
        <p className="side-nav__label side-nav__label--space">设置</p>
        <Link className={`side-nav__item ${location === "/admin/settings" ? "is-active" : ""}`} href="/admin/settings">
          <Settings size={17} /><span>空间设置</span>
        </Link>
      </nav>
      <div className="side-rail__bottom">
        <div className="help-card">
          <div className="help-card__icon"><CircleHelp size={16} /></div>
          <div><strong>需要帮忙？</strong><span>看看使用小贴士</span></div>
          <ChevronDown size={15} className="help-card__chevron" />
        </div>
        <div className="profile-chip">
          <div className="avatar avatar--nav">林</div>
          <div className="profile-chip__copy"><strong>林小满</strong><span>空间管理员</span></div>
          <LogOut size={16} className="profile-chip__logout" />
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <header className="mobile-header">
      <BrandMark />
      <button className="icon-button" aria-label="打开个人菜单"><UserRound size={18} /></button>
    </header>
  );
}

export function AdminFrame({ children, eyebrow, title, action }: { children: ReactNode; eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="app-frame">
      <SideRail />
      <MobileHeader />
      <main className="app-main">
        <header className="page-header">
          <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
          {action && <div className="page-header__actions">{action}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}

export function LivePill({ text = "实时同步中" }: { text?: string }) {
  return <span className="live-pill"><span className="live-pill__dot" />{text}</span>;
}

export function SmallAvatar({ name, tone = "blue" }: { name: string; tone?: "blue" | "orange" | "green" | "purple" }) {
  return <span className={`avatar avatar--${tone}`}>{name.slice(0, 1)}</span>;
}

export function SectionTitle({ icon: Icon, label, meta }: { icon: typeof FileText; label: string; meta?: string }) {
  return <div className="section-title"><div className="section-title__label"><span className="section-title__icon"><Icon size={16} /></span><h2>{label}</h2></div>{meta && <span className="section-title__meta">{meta}</span>}</div>;
}

export const samplePhotos = [
  { id: 1, title: "周末的风很轻", subtitle: "厨房窗台 · 09:42", gradient: "photo-card--sunset" },
  { id: 2, title: "新买的绿萝", subtitle: "阳台 · 昨天", gradient: "photo-card--leaf" },
  { id: 3, title: "晚餐菜单", subtitle: "餐桌 · 09月12日", gradient: "photo-card--table" },
];

export const activityItems = [
  { name: "妹妹", tone: "orange" as const, action: "上传了 2 张图片", time: "刚刚", icon: Sparkles },
  { name: "妈妈", tone: "green" as const, action: "回复了你的笔记", time: "8 分钟前", icon: MessageCircle },
  { name: "爸爸", tone: "blue" as const, action: "打开了分享链接", time: "昨天 19:24", icon: Share2 },
];
