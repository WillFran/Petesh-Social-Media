// src/lib/cloudinary.ts
const CLOUD_NAME = "dwjrrqqta"

export function buildImageUrl(publicId: string, width: number) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`
}