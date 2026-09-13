import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { ApiError, api } from "@/lib/api";

type ShareAccessProps = {
  token: string;
  onUnlocked: () => void;
};

export default function ShareAccess({ token, onUnlocked }: ShareAccessProps) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password.trim() || pending) return;
    setPending(true);
    setError("");
    try {
      await api.share.unlock(token, password);
      onUnlocked();
    } catch (reason) {
      setError(reason instanceof ApiError && reason.code === "INVALID_PASSWORD" ? "密码不正确，请再试一次。" : "暂时无法验证，请稍后重试。 ");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="share-page share-page--access">
      <section className="share-access-card" aria-labelledby="share-access-title">
        <span className="share-access-card__icon"><LockKeyhole size={22} /></span>
        <p className="eyebrow">私密分享空间</p>
        <h1 id="share-access-title">请输入访问密码</h1>
        <p>这个空间开启了额外保护，输入密码后即可查看家人分享的内容。</p>
        <form onSubmit={submit}>
          <label htmlFor="share-password">访问密码</label>
          <input id="share-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" autoFocus aria-invalid={Boolean(error)} aria-describedby={error ? "share-password-error" : undefined} />
          {error && <p id="share-password-error" className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--wide" type="submit" disabled={pending}>{pending ? "验证中…" : "进入分享空间"}</button>
        </form>
      </section>
    </main>
  );
}
