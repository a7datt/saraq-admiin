import React, { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { showToast } from "./ToastContainer";
import OptimizedImage from "./OptimizedImage";
import { uploadImage } from "../utils/uploadImage";

const AdminImageUpload = ({ onUpload, currentUrl, label }: { onUpload: (url: string) => void, currentUrl: string, label: string }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpload(url);
    } catch (err: any) {
      showToast("فشل الرفع: " + (err?.message || "خطأ غير معروف"), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-gray-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="رابط الصورة"
          className="flex-1 p-3 bg-gray-50 border-none rounded-lg text-sm outline-none disabled:opacity-50"
          value={currentUrl}
          onChange={e => onUpload(e.target.value)}
          disabled={uploading}
        />
        <label className={`bg-brand-light text-brand px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${uploading ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-brand-soft"}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "جاري الرفع..." : "رفع"}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {currentUrl && (
        <div className="relative w-16 h-16 rounded-md border border-gray-100 overflow-hidden bg-gray-50">
          <OptimizedImage src={currentUrl} width={128} height={128} className="w-full h-full object-cover" alt="Preview" />
          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin text-brand" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminImageUpload;
