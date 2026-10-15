import * as ImageManipulator from "expo-image-manipulator";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./config";

const MAX_WIDTH = 1080;

function photoRef(uid) {
  // One fixed path per user, so uploading a new photo overwrites the old one
  // instead of leaving orphaned files behind in the bucket.
  return ref(storage, `profilePhotos/${uid}/profile.jpg`);
}

// Phone cameras produce multi-megabyte images; downscaling before upload
// keeps them under the 5MB storage rule and makes the list screens quick.
async function compress(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function uploadProfilePhoto(uid, localUri) {
  const compressedUri = await compress(localUri);
  const response = await fetch(compressedUri);
  const blob = await response.blob();

  const fileRef = photoRef(uid);
  await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
  // Cache-busted so the new photo replaces the old one in the RN image cache,
  // which keys on URL and would otherwise keep showing the previous upload.
  return `${await getDownloadURL(fileRef)}&v=${Date.now()}`;
}

export async function deleteProfilePhoto(uid) {
  try {
    await deleteObject(photoRef(uid));
  } catch (err) {
    // Nothing to delete is a success as far as callers are concerned.
    if (err?.code !== "storage/object-not-found") throw err;
  }
}
