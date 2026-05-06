import fs from "fs";

// helper — cleans up all tmp files if something fails mid-upload

export const cleanupTmpFiles = (files) => {
  if (!files) return;
  Object.values(files).forEach((fileArr) =>
    fileArr.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    }),
  );
};