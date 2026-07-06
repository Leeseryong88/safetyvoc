import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "./firebase";

export async function uploadReportPhoto(ownerId: string, reportId: string, file: File) {
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const storageRef = ref(
    getFirebaseStorage(),
    `reports/${ownerId}/${reportId}/${Date.now()}-${safeName}`,
  );

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });

  return getDownloadURL(storageRef);
}
