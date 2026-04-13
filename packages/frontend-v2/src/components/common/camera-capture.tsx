import { useRef, useState } from 'react';
import { BigButton } from '../ui/primitives';

interface Props {
  onCapture: (base64DataUrl: string) => void;
}

export function CameraCapture({ onCapture }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Resize to max 1600px on the longest edge, JPEG q=0.85
      // Keeps phone photos under ~500KB while readable for OCR
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * (MAX / w)); w = MAX; }
          else { w = Math.round(w * (MAX / h)); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { setPreview(dataUrl); onCapture(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setPreview(compressed);
        onCapture(compressed);
      };
      img.onerror = () => { setPreview(dataUrl); onCapture(dataUrl); };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Prescription" className="w-full rounded-2xl border border-gray-200" />
          <button
            onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
          >×</button>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="text-5xl mb-3">📷</div>
          <p className="text-gray-600 mb-1 font-medium">Capture prescription</p>
          <p className="text-gray-400 text-sm">AI will read patient name, age, doctor, tests</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BigButton
          tone="primary"
          disabled={processing}
          onClick={() => {
            if (!fileRef.current) return;
            fileRef.current.setAttribute('capture', 'environment');
            fileRef.current.click();
          }}
          icon={<span>📷</span>}
        >
          Take Photo
        </BigButton>
        <BigButton
          tone="secondary"
          disabled={processing}
          onClick={() => {
            if (!fileRef.current) return;
            fileRef.current.removeAttribute('capture');
            fileRef.current.click();
          }}
          icon={<span>🖼️</span>}
        >
          Upload
        </BigButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
