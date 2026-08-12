import { createUploadthing, type FileRouter } from 'uploadthing/server';

const f = createUploadthing();

export const ourFileRouter = {
  comprobante: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .onUploadComplete(async ({ file }) => {
      console.log('Upload complete:', file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
