import { useState, useRef, useCallback } from "react";
import { useThemes, useCreateTheme, useUpdateTheme, useAddThemeMedia, useDeleteThemeMedia, useDeleteTheme } from "@/hooks/use-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, Loader2, Upload, X, Film, FileImage, Pencil, Trash2, Images } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { BASE_URL } from "@/lib/api";

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
const BACKEND_URL = BASE_URL;

function isVideoUrl(url: string) {
  if (!url) return false;
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.includes(ext);
}

function resolveMediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

// ===== Multi-file Theme Form =====
function ThemeForm({ initialData, onSubmit, isPending, submitLabel }: {
  initialData?: { name: string; description: string };
  onSubmit: (fd: FormData) => Promise<void>;
  isPending: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ file: File; url: string; isVideo: boolean }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    const newPreviews = newFiles.map(f => {
      const isVid = f.type.startsWith('video/');
      return {
        file: f,
        url: isVid ? '' : URL.createObjectURL(f),
        isVideo: isVid,
      };
    });
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      if (prev[index]?.url) URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) handleFiles(dropped);
  }, [handleFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    files.forEach(f => fd.append("media", f));
    await onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Royal Heritage" className="h-11 rounded-xl bg-muted/30" />
      </div>

      {/* Drag & Drop Zone */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Media (Photos & Videos)
        </Label>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-muted/10'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) handleFiles(Array.from(e.target.files)); e.target.value = ''; }}
          />
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Drag & drop images or videos</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse • Multiple files supported</p>
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {previews.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                {p.isVideo ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Film className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground ml-1">{p.file.name.slice(0, 8)}...</span>
                  </div>
                ) : (
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Describe this theme..." className="resize-none h-24 rounded-xl bg-muted/30" />
      </div>

      <Button type="submit" disabled={isPending} className="w-full h-11 rounded-xl font-semibold shadow-sm">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
        {submitLabel}
      </Button>
    </form>
  );
}

// ===== Main Themes Page =====
export default function Themes() {
  const { data: themes = [], isLoading } = useThemes();
  const createTheme = useCreateTheme();
  const updateTheme = useUpdateTheme();
  const addMedia = useAddThemeMedia();
  const deleteMedia = useDeleteThemeMedia();
  const deleteTheme = useDeleteTheme();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTheme, setEditTheme] = useState<any>(null);
  const [galleryTheme, setGalleryTheme] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Decoration Themes</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and view available decoration themes</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-xl shadow-md w-full sm:w-auto touch-target">
          <Plus className="w-4 h-4 mr-2" /> Add Theme
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {themes.map((theme: any) => {
            const coverUrl = resolveMediaUrl(theme.imageUrl || '');
            const isVideo = isVideoUrl(theme.imageUrl || '');
            const mediaCount = theme.media?.length || 0;

            return (
              <motion.div
                key={theme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setGalleryTheme(theme)}
              >
                <div className="h-52 overflow-hidden bg-muted relative">
                  {isVideo ? (
                    <video src={coverUrl} muted loop playsInline className="w-full h-full object-cover"
                      onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                    />
                  ) : (
                    <img
                      src={coverUrl || "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&auto=format&fit=crop"}
                      alt={theme.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&auto=format&fit=crop" }}
                    />
                  )}
                  {/* Media count badge */}
                  {mediaCount > 0 && (
                    <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                      <Images className="w-3 h-3" /> {mediaCount} {mediaCount === 1 ? 'file' : 'files'}
                    </span>
                  )}
                  {/* Edit & Delete buttons */}
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditTheme(theme); }}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-primary text-white flex items-center justify-center"
                      title="Edit theme"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(theme.id); }}
                      className="w-9 h-9 rounded-full bg-black/50 hover:bg-destructive text-white flex items-center justify-center"
                      title="Delete theme"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground text-lg">{theme.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{theme.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Theme Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">New Theme</DialogTitle>
            </DialogHeader>
            <ThemeForm
              onSubmit={async (fd) => { await createTheme.mutateAsync(fd); setCreateOpen(false); }}
              isPending={createTheme.isPending}
              submitLabel="Save Theme"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Theme Dialog */}
      <Dialog open={!!editTheme} onOpenChange={open => { if (!open) setEditTheme(null); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold">Edit Theme</DialogTitle>
            </DialogHeader>

            {editTheme && (
              <>
                {/* Existing media gallery */}
                {editTheme.media?.length > 0 && (
                  <div className="mb-5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Current Media ({editTheme.media.length} files)
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {editTheme.media.map((m: any) => {
                        const url = resolveMediaUrl(m.mediaUrl);
                        const isVid = isVideoUrl(m.mediaUrl);
                        return (
                          <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                            {isVid ? (
                              <video src={url} muted className="w-full h-full object-cover" />
                            ) : (
                              <img src={url} alt="" className="w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200" }}
                              />
                            )}
                            <button
                              onClick={() => {
                                deleteMedia.mutate({ themeId: editTheme.id, mediaId: m.id });
                                setEditTheme((prev: any) => ({
                                  ...prev,
                                  media: prev.media.filter((item: any) => item.id !== m.id)
                                }));
                              }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <ThemeForm
                  initialData={{ name: editTheme.name, description: editTheme.description }}
                  onSubmit={async (fd) => {
                    await updateTheme.mutateAsync({ id: editTheme.id, formData: fd });
                    setEditTheme(null);
                  }}
                  isPending={updateTheme.isPending}
                  submitLabel="Update Theme"
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery View Dialog */}
      <Dialog open={!!galleryTheme} onOpenChange={open => { if (!open) setGalleryTheme(null); }}>
        <DialogContent className="sm:max-w-4xl rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="p-6 flex-1 overflow-y-auto">
            {galleryTheme && (
              <>
                <DialogHeader className="mb-5">
                  <DialogTitle className="text-2xl font-bold">{galleryTheme.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{galleryTheme.description}</p>
                </DialogHeader>

                {galleryTheme.media?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {galleryTheme.media.map((m: any) => {
                      const url = resolveMediaUrl(m.mediaUrl);
                      const isVid = isVideoUrl(m.mediaUrl);
                      return (
                        <div key={m.id} className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                          {isVid ? (
                            <video src={url} controls playsInline className="w-full h-full object-cover" />
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                              onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
                    <p>No media files uploaded for this theme yet.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-destructive via-red-400 to-destructive" />
          <div className="p-6 text-center">
            <Trash2 className="w-12 h-12 text-destructive mx-auto mb-3" />
            <DialogTitle className="text-xl font-bold mb-2">Delete Theme?</DialogTitle>
            <p className="text-muted-foreground text-sm mb-6">This will permanently delete this theme and all its media. This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1 h-11 rounded-xl font-semibold"
                disabled={deleteTheme.isPending}
                onClick={() => { if (deleteConfirm) { deleteTheme.mutate(deleteConfirm); setDeleteConfirm(null); } }}
              >
                {deleteTheme.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
