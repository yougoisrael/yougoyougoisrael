// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Yougo — R2 Image Upload Utility
//  رفع الصور لـ Cloudflare R2 (مجاني للأبد)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL; // https://assets.yougo.app
const R2_UPLOAD_ENDPOINT = import.meta.env.VITE_R2_UPLOAD_ENDPOINT; // Cloudflare Worker endpoint

/**
 * رفع صورة لـ R2 والحصول على الرابط العام
 * @param {File} file - ملف الصورة
 * @param {string} folder - المجلد: "stores" | "products" | "avatars"
 * @param {string} id - معرف المتجر أو المنتج
 * @returns {Promise<string>} الرابط العام للصورة
 */
export async function uploadImageToR2(file, folder, id) {
  // توليد اسم فريد للصورة
  const ext = file.name.split(".").pop();
  const fileName = `${folder}/${id}/${Date.now()}.${ext}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", fileName);

  const response = await fetch(`${R2_UPLOAD_ENDPOINT}/upload`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_R2_UPLOAD_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("فشل رفع الصورة");
  }

  return `${R2_PUBLIC_URL}/${fileName}`;
}

/**
 * حذف صورة من R2
 * @param {string} imageUrl - الرابط الكامل للصورة
 */
export async function deleteImageFromR2(imageUrl) {
  const key = imageUrl.replace(`${R2_PUBLIC_URL}/`, "");

  await fetch(`${R2_UPLOAD_ENDPOINT}/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_R2_UPLOAD_TOKEN}`,
    },
    body: JSON.stringify({ key }),
  });
}

/**
 * مكوّن React لرفع الصور مع Preview
 */
export function ImageUploader({ folder, id, onUpload, currentUrl }) {
  const [preview, setPreview] = React.useState(currentUrl || null);
  const [loading, setLoading] = React.useState(false);

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Preview فوري
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const url = await uploadImageToR2(file, folder, id);
      onUpload(url);
    } catch (err) {
      alert("فشل رفع الصورة، حاول مرة ثانية");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="image-uploader">
      {preview && <img src={preview} alt="preview" style={{ width: 100, borderRadius: 8 }} />}
      <input type="file" accept="image/*" onChange={handleChange} disabled={loading} />
      {loading && <span>جاري الرفع...</span>}
    </div>
  );
}
