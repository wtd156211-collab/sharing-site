import { ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { ApiError, api } from "@/lib/api";

type ImageUploaderProps = {
  token?: string;
  onUploaded?: (entry: Record<string, unknown>) => void;
};

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ImageUploader({ token, onUploaded }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("支持 JPG、PNG、WEBP · 单张最大 10 MB");
  const [pending, setPending] = useState(false);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!allowedTypes.has(file.type)) { setMessage("只支持 JPG、PNG 或 WEBP 图片"); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage("图片不能超过 10 MB"); return; }
    if (!token) { setMessage("请先创建分享空间，再上传图片"); return; }
    setPending(true);
    setMessage("正在上传…");
    try {
      const result = await api.share.uploadImage(token, file);
      onUploaded?.(result.entry);
      setMessage("图片已上传");
    } catch (reason) {
      setMessage(reason instanceof ApiError ? reason.message : "上传失败，请重试");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="image-uploader">
      <div className="image-uploader__icon"><ImagePlus size={28} /></div>
      <strong>拖拽图片到这里</strong>
      <span>{message}</span>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={selectFile} />
      <button className="button button--secondary" type="button" disabled={pending} onClick={() => inputRef.current?.click()}><Upload size={15} />{pending ? "上传中…" : "选择图片"}</button>
    </div>
  );
}
