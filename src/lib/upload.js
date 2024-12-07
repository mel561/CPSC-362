import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";

// Change to default export
export default async function upload(file) {
  try {
    // For now, just return a data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
}

// Later Firebase implementation:
/*
export default async function upload(file) {
  try {
    const storage = getStorage();
    const storageRef = ref(storage, uuid());
    await uploadBytesResumable(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
}
*/