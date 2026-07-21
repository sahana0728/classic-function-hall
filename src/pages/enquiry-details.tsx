import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@shared/routes";
import { fetchWithAuth, parseWithLogging } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { ArrowLeft, Loader2, Calendar, Phone, CheckCircle2, ArrowRightLeft, MessageSquare, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AuditLogTimeline } from "@/components/audit-log-timeline";

export default function EnquiryDetails() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const path = window.location.pathname;
  const enquiryId = path.split("/").pop();

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({ totalAmount: "", advancePaid: "", themeId: "" });

  // Get Enquiry Data
  const { data: enquiry, isLoading } = useQuery({
    queryKey: [api.enquiries.get.path, enquiryId],
    queryFn: async () => {
      if (!enquiryId) return null;
      const url = api.enquiries.get.path.replace(":id", enquiryId);
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error("Failed to fetch enquiry");
      const data = await res.json();
      return parseWithLogging(api.enquiries.get.responses[200], data, "enquiry.details");
    },
    enabled: !!enquiryId
  });

  // Get Themes (for conversion dialogue)
  const { data: themes = [], isLoading: isLoadingThemes } = useQuery({
    queryKey: [api.themes.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.themes.list.path);
      if (!res.ok) return [];
      return await res.json();
    }
  });

  const convertMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; totalAmount: number; advancePaid: number; themeId?: number }) => {
      const res = await fetchWithAuth(`/api/enquiries/${id}/convert`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || result.message || "Failed to convert");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.enquiries.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.calendar.list.path] });
      toast({ title: "Enquiry converted to booking!" });
      setConvertOpen(false);
      setLocation("/bookings"); // Redirect to bookings upon success
    },
    onError: (err: Error) => {
      toast({ title: "Conversion failed", description: err.message, variant: "destructive" });
    }
  });

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiry) return;

    const totalAmount = Number(convertForm.totalAmount);
    const advancePaid = Number(convertForm.advancePaid);

    if (advancePaid > totalAmount) {
      toast({
        title: "Invalid Amount",
        description: "Advance Paid cannot be greater than Total Amount",
        variant: "destructive",
      });
      return;
    }

    convertMutation.mutate({
      id: enquiry.id,
      totalAmount,
      advancePaid,
      themeId: convertForm.themeId ? Number(convertForm.themeId) : undefined,
    });
  };

  if (isLoading) {
    return <div className="h-full flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary mb-2" /> Loading Details...</div>;
  }

  if (!enquiry) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground font-medium">Enquiry not found.</p>
        <Button onClick={() => setLocation("/enquiries")} variant="outline" className="mt-4">Go back to Enquiries</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/enquiries")} className="hover-elevate">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-yellow-100/50 flex items-center justify-center text-yellow-600 flex-shrink-0">
               <MessageSquare className="w-5 h-5" />
             </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Enquiry Details</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{enquiry.name}</p>
            </div>
          </div>
        </div>
        
        <Button 
           onClick={() => setConvertOpen(true)} 
           className="shadow-sm bg-yellow-600 hover:bg-yellow-700 text-white hover-elevate w-full sm:w-auto"
        >
           <ArrowRightLeft className="w-4 h-4 mr-2" />
           Convert to Booking
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <Card className="p-6 shadow-md border-border/50 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
            Customer Information
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg">
              <span className="text-muted-foreground text-sm">Full Name</span>
              <span className="font-semibold">{enquiry.name}</span>
            </div>
            <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg">
              <span className="text-muted-foreground text-sm flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</span>
              <span className="font-semibold">{enquiry.phone}</span>
            </div>
          </div>
        </Card>

        {/* Event Dates Card */}
        <Card className="p-6 shadow-md border-border/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-4">
             <Calendar className="w-3.5 h-3.5" /> Event Dates
          </h3>
          
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <div className="flex justify-center items-center gap-3 text-lg font-semibold text-foreground mb-1">
              <span>{enquiry.startDate ? format(new Date(enquiry.startDate), "MMM d, yyyy") : "TBD"}</span>
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
              <span>{enquiry.endDate ? format(new Date(enquiry.endDate), "MMM d, yyyy") : "TBD"}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
              Requested Block
            </p>
          </div>

          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-yellow-600" />
            <p>
              <strong>Availability Note:</strong> If converted, hall will be explicitly available from{' '}
              <strong>
                {enquiry.startDate ? format(subDays(new Date(enquiry.startDate), 1), "MMM d") + " at 4:00 PM" : "TBD"}
              </strong>{' '}
              until{' '}
              <strong>
                {enquiry.endDate ? format(new Date(enquiry.endDate), "MMM d") + " at 4:00 PM" : "TBD"}
              </strong>.
            </p>
          </div>
        </Card>
      </div>

      {/* Notes */}
      <Card className="p-6 shadow-md border-border/50">
         <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Enquiry Notes / Requirements</h3>
         <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/50">
           {enquiry.notes || <span className="text-muted-foreground italic">No specific notes provided for this enquiry.</span>}
         </p>
      </Card>

      {/* Audit Logs Sidebar - Full Width Timeline here */}
      <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mt-8 pt-4 border-t border-border">
         <History className="w-5 h-5 text-muted-foreground" />
         Timeline History
      </h2>
      <AuditLogTimeline entityType="enquiry" entityId={enquiryId!} />


      {/* Convert to Booking Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl overflow-hidden p-0">
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <ArrowRightLeft className="w-5 h-5 text-yellow-600" />
                Convert to Booking
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleConvert} className="space-y-5">
               <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3.5">
                  <p className="text-xs text-yellow-800 leading-snug">
                     Converting the enquiry for <strong>{enquiry.name}</strong> from <strong>{enquiry.startDate ? format(new Date(enquiry.startDate), "MMM d") : "TBD"} - {enquiry.endDate ? format(new Date(enquiry.endDate), "MMM d") : "TBD"}</strong>.<br/> Make sure there are no date conflicts.
                  </p>
               </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Amount (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 50000"
                  value={convertForm.totalAmount}
                  onChange={e => setConvertForm({ ...convertForm, totalAmount: e.target.value })}
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advancePaid" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advance Paid (₹)</Label>
                <Input
                  id="advancePaid"
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 10000"
                  value={convertForm.advancePaid}
                  onChange={e => setConvertForm({ ...convertForm, advancePaid: e.target.value })}
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decoration Theme <span className="text-muted-foreground font-normal lowercase">(Optional)</span></Label>
                <Select disabled={isLoadingThemes} onValueChange={(val) => setConvertForm({ ...convertForm, themeId: val })}>
                  <SelectTrigger className="h-11 bg-muted/30">
                    <SelectValue placeholder="Select a theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((t: any) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={convertMutation.isPending} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white h-11 rounded-xl shadow-md">
                {convertMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                Confirm Conversion
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
