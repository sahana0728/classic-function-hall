import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@shared/routes";
import { fetchWithAuth, parseWithLogging, getAuthToken, BASE_URL } from "@/lib/api";
import { useThemes } from "@/hooks/use-themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuditLogTimeline } from "@/components/audit-log-timeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays } from "date-fns";
import { ArrowLeft, Loader2, Calendar, Phone, DollarSign, Palette, Pencil, Save, X, Film, Plus, Upload, Trash2, ImageIcon, CheckCircle2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isBookingClosed } from "./bookings";

const BACKEND = BASE_URL;
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

function isVideoUrl(url: string) {
  if (!url) return false;
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.includes(ext);
}

function resolveMediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND}${url}`;
}

export default function BookingDetails() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const path = window.location.pathname;
  const bookingId = path.split("/").pop();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  
  const [isEditingAdvance, setIsEditingAdvance] = useState(false);
  const [editedAdvance, setEditedAdvance] = useState("");
  const [addThemeOpen, setAddThemeOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: [api.bookings.get.path, bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const url = api.bookings.get.path.replace(":id", bookingId);
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error("Failed to fetch booking");
      const data = await res.json();
      return parseWithLogging(api.bookings.get.responses[200], data, "booking.details");
    },
    enabled: !!bookingId
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetchWithAuth(`/api/bookings/${bookingId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'booking', bookingId] });
      toast({ title: "Notes updated successfully" });
      setIsEditingNotes(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update notes", description: err.message, variant: "destructive" });
    }
  });

  const updateAdvance = useMutation({
    mutationFn: async (advancePaid: number) => {
      const res = await fetchWithAuth(`/api/bookings/${bookingId}/advancePaid`, {
        method: "PATCH",
        body: JSON.stringify({ advancePaid }),
      });
      if (!res.ok) throw new Error("Failed to update advance payment");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'booking', bookingId] });
      toast({ title: "Advance payment updated" });
      setIsEditingAdvance(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update advance", description: err.message, variant: "destructive" });
    }
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    phone: "",
    startDate: "",
    endDate: "",
    totalAmount: "",
    notes: "",
    status: ""
  });

  const updateBooking = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await fetchWithAuth(`/api/bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          totalAmount: Number(data.totalAmount)
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update booking");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: [api.calendar.list.path] });
      toast({ title: "Booking updated successfully" });
      setEditDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update booking", description: err.message, variant: "destructive" });
    }
  });

  const addPayment = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetchWithAuth(`/api/bookings/${bookingId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        let errorMessage = "Failed to add payment";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'booking', bookingId] });
      toast({ title: "Payment added successfully" });
      setIsEditingAdvance(false);
      setEditedAdvance("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add payment", description: err.message, variant: "destructive" });
    }
  });

  const addDecoration = useMutation({
    mutationFn: async (data: { themeId?: number; label?: string; notes?: string; file?: File; mediaUrl?: string }) => {
      const formData = new FormData();
      if (data.themeId) formData.append('themeId', data.themeId.toString());
      if (data.label) formData.append('label', data.label);
      if (data.notes) formData.append('notes', data.notes);
      if (data.file) formData.append('media', data.file);
      if (data.mediaUrl) formData.append('mediaUrl', data.mediaUrl);

      const token = getAuthToken();
      const res = await fetch(`${BACKEND}/api/bookings/${bookingId}/decorations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to add decoration");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, bookingId] });
      toast({ title: "Decoration added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add decoration", description: err.message, variant: "destructive" });
    }
  });

  const removeDecoration = useMutation({
    mutationFn: async (decorationId: number) => {
      const res = await fetchWithAuth(`/api/bookings/${bookingId}/decorations/${decorationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', 'booking', bookingId] });
      toast({ title: "Decoration removed" });
    },
  });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!booking) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground font-medium">Booking not found.</p>
        <Button onClick={() => setLocation("/bookings")} variant="outline" className="mt-4">Go back</Button>
      </div>
    );
  }

  const balanceLeft = booking.totalAmount - booking.advancePaid;
  const decorations = booking.decorations || [];
  const isClosed = isBookingClosed(booking);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/bookings")} className="hover-elevate">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Booking Details</h1>
          <p className="text-muted-foreground mt-1">{booking.customerName}</p>
        </div>
      </div>

      {/* Customer + Event Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 shadow-md border-border/50 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer Information</h3>
            {!isClosed && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:bg-muted" 
                onClick={() => {
                  setEditForm({
                    customerName: booking.customerName,
                    phone: booking.phone,
                    startDate: booking.startDate ? booking.startDate.split('T')[0] : "",
                    endDate: booking.endDate ? booking.endDate.split('T')[0] : "",
                    totalAmount: booking.totalAmount.toString(),
                    notes: booking.notes || "",
                    status: booking.status
                  });
                  setEditDialogOpen(true);
                }}
                title="Edit booking details"
              >
                <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-semibold">{booking.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-4 h-4" /> Phone:</span>
              <span className="font-semibold">{booking.phone}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Event Dates:</span>
              <span className="font-semibold text-sm">{format(new Date(booking.startDate), "MMM d")} - {format(new Date(booking.endDate), "MMM d")}</span>
            </div>
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <p>
                <strong>Availability Note:</strong> Hall explicitly available from{' '}
                <strong>
                  {format(subDays(new Date(booking.startDate), 1), "MMM d, yyyy")} at 4:00 PM
                </strong>{' '}
                until{' '}
                <strong>
                  {format(new Date(booking.endDate), "MMM d, yyyy")} at 4:00 PM
                </strong>.
              </p>
            </div>
          </div>
        </Card>

        {/* Financial Info */}
        <Card className="p-6 shadow-md border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Payment Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-display font-bold text-primary">₹{booking.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 border border-green-200/50 group relative">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Total Paid</p>
              </div>
              
              <p className="text-xl font-display font-bold text-green-600 mb-3">₹{booking.advancePaid.toLocaleString()}</p>

              {balanceLeft > 0 ? (
                !isEditingAdvance ? (
                  <Button 
                     onClick={() => setIsEditingAdvance(true)}
                     variant="outline" 
                     size="sm" 
                     className="w-full bg-white/50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Payment
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 mt-2 bg-white rounded-md p-2 border border-green-200 shadow-sm transition-all focus-within:ring-1 focus-within:ring-green-500">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-sm text-green-700 font-bold z-10 pointer-events-none">₹</span>
                      <Input 
                        autoFocus
                        type="number" 
                        min="1"
                        max={balanceLeft}
                        placeholder="Amount"
                        value={editedAdvance} 
                        onChange={e => setEditedAdvance(e.target.value)} 
                        className="h-8 pl-6 pr-2 py-1 text-sm font-semibold bg-transparent border border-green-100 rounded focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full"
                      />
                    </div>
                    <div className="flex gap-1 justify-end">
                      <button 
                        onClick={() => addPayment.mutate(Number(editedAdvance))} 
                        disabled={addPayment.isPending || !editedAdvance || isNaN(Number(editedAdvance)) || Number(editedAdvance) <= 0 || Number(editedAdvance) > balanceLeft} 
                        className="flex-1 h-7 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded shadow-sm text-xs font-semibold gap-1"
                      >
                        {addPayment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save
                      </button>
                      <button 
                        onClick={() => { setIsEditingAdvance(false); setEditedAdvance(""); }} 
                        className="w-7 h-7 flex flex-shrink-0 items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full bg-green-100/50 border border-green-200 text-green-800 text-xs font-bold text-center py-1.5 rounded uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                </div>
              )}
            </div>
            <div className={`rounded-xl p-3 border ${balanceLeft === 0
              ? 'bg-green-50 border-green-200/50'
              : 'bg-yellow-50 border-yellow-200/50'}`}>
              <p className={`text-xs font-semibold ${balanceLeft === 0 ? 'text-green-700' : 'text-yellow-700'} uppercase tracking-wider mb-1`}>Balance</p>
              <p className={`text-xl font-display font-bold ${balanceLeft === 0 ? 'text-green-600' : 'text-yellow-600'}`}>₹{balanceLeft.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Installments List */}
          {booking.payments && booking.payments.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Installment History</h4>
              <div className="space-y-2">
                {booking.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center bg-muted/20 p-2.5 rounded-lg border border-border/50">
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {format(new Date(p.payment_date), "MMM d, yyyy")}
                      <span className="text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                        {p.recorded_by ? p.recorded_by.split('@')[0] : 'Admin'}
                      </span>
                    </span>
                    <span className="font-semibold text-green-600">₹{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ===== EVENT DECORATIONS — Mix & Match ===== */}
      <Card className="p-6 shadow-md border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Event Decorations
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Mix and match themes or upload custom designs</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!isClosed && (
              <>
                <Button variant="outline" size="sm" onClick={() => setAddThemeOpen(true)} className="flex-1 sm:flex-none rounded-xl">
                  <Plus className="w-4 h-4 mr-1.5" /> From Themes
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="flex-1 sm:flex-none rounded-xl">
                  <Upload className="w-4 h-4 mr-1.5" /> Custom Upload
                </Button>
              </>
            )}
          </div>
        </div>

        {decorations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-primary/60" />
            </div>
            <p className="text-muted-foreground font-medium">No decorations added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add from the theme catalog or upload custom designs</p>
            {!isClosed && (
              <div className="flex gap-3 mt-4">
                <Button variant="outline" size="sm" onClick={() => setAddThemeOpen(true)} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1.5" /> Browse Themes
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="rounded-xl">
                  <Upload className="w-4 h-4 mr-1.5" /> Upload Custom
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {decorations.map((deco: any) => {
                const imageUrl = deco.customImage
                  ? resolveMediaUrl(deco.customImage)
                  : resolveMediaUrl(deco.themeImage || '');
                const isVideo = isVideoUrl(deco.customImage || deco.themeImage || '');
                const title = deco.label || deco.themeName || 'Custom Design';
                const subtitle = deco.themeId ? `From: ${deco.themeName}` : 'Custom Upload';

                return (
                  <motion.div
                    key={deco.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-all"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      {isVideo ? (
                        <video src={imageUrl} muted loop playsInline className="w-full h-full object-cover"
                          onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                        />
                      ) : (
                        <img src={imageUrl || "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&auto=format&fit=crop"}
                          alt={title} className="w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&auto=format&fit=crop" }}
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm truncate">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                      {deco.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">{deco.notes}</p>}
                    </div>
                    {!isClosed && (
                      <button
                        onClick={() => removeDecoration.mutate(deco.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {deco.themeId && (
                      <span className="absolute top-2 left-2 text-xs bg-primary/80 text-white px-2 py-0.5 rounded-full font-medium">Theme</span>
                    )}
                    {!deco.themeId && (
                      <span className="absolute top-2 left-2 text-xs bg-amber-500/80 text-white px-2 py-0.5 rounded-full font-medium">Custom</span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Editable Notes */}
      <Card className="p-6 shadow-md border-border/50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Additional Notes</h3>
          {!isClosed && (
            !isEditingNotes ? (
              <Button variant="ghost" size="sm" onClick={() => { setEditedNotes(booking.notes || ""); setIsEditingNotes(true); }} className="text-muted-foreground hover:text-primary">
                <Pencil className="w-4 h-4 mr-1.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(false)} className="text-muted-foreground">
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={() => updateNotes.mutate(editedNotes)} disabled={updateNotes.isPending} className="shadow-sm">
                  {updateNotes.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </div>
            )
          )}
        </div>
        {isEditingNotes ? (
          <Textarea value={editedNotes} onChange={e => setEditedNotes(e.target.value)} placeholder="Add notes about the booking..." className="resize-none min-h-[100px] bg-muted/30" autoFocus />
        ) : (
          <p className="text-foreground whitespace-pre-wrap">
            {booking.notes || <span className="text-muted-foreground italic">No notes added yet. Click Edit to add notes.</span>}
          </p>
        )}
      </Card>

      {/* Status */}
      <div className="flex justify-between items-center pt-4">
        <span className="text-muted-foreground">Status:</span>
        {isClosed ? (
          <span className="px-4 py-2 rounded-lg bg-muted text-muted-foreground font-semibold uppercase text-sm tracking-wider">
            Closed
          </span>
        ) : (
          <span className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-semibold uppercase text-sm tracking-wider">
            {booking.status}
          </span>
        )}
      </div>

      {/* ===== AUDIT LOGS ===== */}
      <div className="pt-6 border-t border-border mt-8">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
          <History className="w-5 h-5 text-muted-foreground" />
          Timeline History
        </h2>
        <AuditLogTimeline entityType="booking" entityId={bookingId!} />
      </div>

      {/* Dialogs */}
      <AddFromThemesDialog
        open={addThemeOpen}
        onOpenChange={setAddThemeOpen}
        onAdd={(data) => {
          addDecoration.mutate(data);
          setAddThemeOpen(false);
        }}
      />
      <CustomUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={(file, label, notes) => {
          addDecoration.mutate({ file, label, notes });
          setUploadOpen(false);
        }}
      />

      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-primary/80 flex-shrink-0" />
          <div className="p-6 md:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">Edit Booking Details</DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => {
              e.preventDefault();
              const cleanPhone = editForm.phone.replace(/[\s\-()]/g, "");
              const phoneRegex = /^(?:\+?91|0)?[6-9]\d{9}$/;
              if (!phoneRegex.test(cleanPhone)) {
                toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit mobile number.", variant: "destructive" });
                return;
              }
              if (editForm.startDate && editForm.endDate && new Date(editForm.endDate) < new Date(editForm.startDate)) {
                toast({ title: "Invalid Dates", description: "End Date cannot be before Start Date.", variant: "destructive" });
                return;
              }
              updateBooking.mutate(editForm);
            }} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Customer Name *</Label>
                <Input
                  id="edit-name"
                  required
                  value={editForm.customerName}
                  onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="h-11 rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  required
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="h-11 rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-start">Start Date *</Label>
                  <Input
                    id="edit-start"
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={e => {
                      const newStart = e.target.value;
                      let newEnd = editForm.endDate;
                      if (newEnd && newStart && new Date(newEnd) < new Date(newStart)) {
                        newEnd = newStart;
                      }
                      setEditForm({ ...editForm, startDate: newStart, endDate: newEnd });
                    }}
                    className="h-11 rounded-xl bg-muted/20 border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-end">End Date *</Label>
                  <Input
                    id="edit-end"
                    type="date"
                    required
                    min={editForm.startDate}
                    value={editForm.endDate}
                    onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount">Total Amount (₹) *</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    required
                    min="0"
                    value={editForm.totalAmount}
                    onChange={e => setEditForm({ ...editForm, totalAmount: e.target.value })}
                    className="h-11 rounded-xl bg-muted/20 border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-status">Status *</Label>
                  <select
                    id="edit-status"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="flex h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  >
                    <option value="Booked">Booked</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Booking Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="resize-none h-20 rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateBooking.isPending}
                  className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-md"
                >
                  {updateBooking.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-1.5" /> : <Save className="w-5 h-5 mr-1.5" />}
                  Save
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Add From Themes Dialog (two-step: pick theme → pick multiple images) =====
function AddFromThemesDialog({ open, onOpenChange, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void; onAdd: (data: { themeId?: number; label?: string; mediaUrl?: string }) => void;
}) {
  const { data: themes = [], isLoading } = useThemes();
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [label, setLabel] = useState("");

  const toggleMedia = (url: string) => {
    setSelectedMediaUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const selectAll = () => {
    if (!selectedTheme?.media) return;
    const allUrls = selectedTheme.media.map((m: any) => m.mediaUrl);
    setSelectedMediaUrls(prev =>
      prev.length === allUrls.length ? [] : allUrls
    );
  };

  const handleAdd = () => {
    if (!selectedTheme) return;
    if (selectedMediaUrls.length > 0) {
      // Add each selected image as a separate decoration
      selectedMediaUrls.forEach(url => {
        onAdd({
          themeId: selectedTheme.id,
          label: label || selectedTheme.name,
          mediaUrl: url,
        });
      });
    } else {
      // Add entire theme — add all media individually for better visibility
      if (selectedTheme.media?.length > 0) {
        selectedTheme.media.forEach((m: any) => {
          onAdd({
            themeId: selectedTheme.id,
            label: label || selectedTheme.name,
            mediaUrl: m.mediaUrl,
          });
        });
      } else {
        // Fallback: no media, just add the theme reference
        onAdd({
          themeId: selectedTheme.id,
          label: label || selectedTheme.name,
        });
      }
    }
    setSelectedTheme(null);
    setSelectedMediaUrls([]);
    setLabel("");
  };

  const handleBack = () => {
    setSelectedTheme(null);
    setSelectedMediaUrls([]);
  };

  const resetAndClose = (o: boolean) => {
    onOpenChange(o);
    if (!o) { setSelectedTheme(null); setSelectedMediaUrls([]); setLabel(""); }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-xl rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedTheme ? (
                <span className="flex items-center gap-2">
                  <button onClick={handleBack} className="hover:text-primary transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {selectedTheme.name} — Pick Images
                </span>
              ) : "Select a Theme"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedTheme
                ? "Click images to select them (multi-select), or add the entire theme"
                : "Browse themes to pick decorations for this booking"}
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !selectedTheme ? (
            /* Step 1: Theme list */
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme: any) => {
                const imageUrl = resolveMediaUrl(theme.imageUrl || '');
                const mediaCount = theme.media?.length || 0;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className="text-left rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all hover:shadow-md"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                      <img src={imageUrl || "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400"}
                        alt={theme.name} className="w-full h-full object-cover"
                        onError={(e: any) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400" }}
                      />
                      {mediaCount > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                          {mediaCount} {mediaCount === 1 ? 'image' : 'images'}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-semibold text-sm truncate">{theme.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Step 2: Multi-select image picker */
            <>
              {selectedTheme.media?.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedMediaUrls.length > 0
                        ? <span className="text-primary font-semibold">{selectedMediaUrls.length} selected</span>
                        : "Click images to select"}
                    </span>
                    <button
                      onClick={selectAll}
                      className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      {selectedMediaUrls.length === selectedTheme.media.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedTheme.media.map((m: any) => {
                      const url = resolveMediaUrl(m.mediaUrl);
                      const isVid = isVideoUrl(m.mediaUrl);
                      const isSelected = selectedMediaUrls.includes(m.mediaUrl);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleMedia(m.mediaUrl)}
                          className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${isSelected ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border hover:border-primary/30'
                            }`}
                        >
                          {isVid ? (
                            <video src={url} muted className="w-full h-full object-cover" />
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover"
                              onError={(e: any) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200" }}
                            />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <CheckCircle2 className="w-8 h-8 text-primary bg-white rounded-full" />
                            </div>
                          )}
                          {isVid && (
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Film className="w-2.5 h-2.5" /> Video
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No individual images in this theme.</p>
                  <p className="text-xs mt-1">You can still add the whole theme as a decoration.</p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Label <span className="font-normal">(e.g., "Stage Decor", "Entrance")</span>
                </Label>
                <Input
                  value={label}
                  onChange={(e: any) => setLabel(e.target.value)}
                  placeholder={selectedTheme.name}
                  className="h-10 rounded-xl bg-muted/30"
                />
              </div>
            </>
          )}
        </div>

        {selectedTheme && (
          <div className="p-6 pt-3 border-t border-border">
            <Button onClick={handleAdd} className="w-full h-11 rounded-xl font-semibold shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              {selectedMediaUrls.length > 1
                ? `Add ${selectedMediaUrls.length} Selected Images`
                : selectedMediaUrls.length === 1
                  ? "Add Selected Image"
                  : "Add Entire Theme"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== Custom Upload Dialog =====
function CustomUploadDialog({ open, onOpenChange, onUpload }: {
  open: boolean; onOpenChange: (o: boolean) => void; onUpload: (file: File, label: string, notes: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file, label, notes);
    setFile(null);
    setPreview(null);
    setLabel("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Upload Custom Design</DialogTitle>
            <p className="text-sm text-muted-foreground">Upload a custom decoration image for this booking</p>
          </DialogHeader>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all mb-4 ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-muted/20'
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {preview ? (
              <div className="space-y-2">
                <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                <p className="text-sm text-muted-foreground">{file?.name}</p>
              </div>
            ) : file ? (
              <div className="space-y-2">
                <Film className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-sm font-medium">{file.name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">Drag & drop an image or video</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Stage Decor, Entrance, Table Setup" className="h-10 rounded-xl bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." className="resize-none h-16 rounded-xl bg-muted/30" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!file} className="w-full h-11 rounded-xl font-semibold shadow-sm mt-4">
            <Upload className="w-4 h-4 mr-1.5" /> Upload Decoration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
