import { create } from "zustand";

interface ImageEditState {
  files: File[];
  index: number;
  noteId: string | null;
  queue: (files: File[], noteId: string) => void;
  next: () => void;
  close: () => void;
}

export const useImageEdit = create<ImageEditState>((set, get) => ({
  files: [],
  index: 0,
  noteId: null,

  queue(files, noteId) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    set({ files: images, index: 0, noteId });
  },

  next() {
    const { files, index } = get();
    if (index + 1 >= files.length) {
      set({ files: [], index: 0, noteId: null });
      return;
    }
    set({ index: index + 1 });
  },

  close() {
    set({ files: [], index: 0, noteId: null });
  },
}));
