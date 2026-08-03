import { useState } from "react";
import { useLocation } from "wouter";
import { useThemes } from "@/hooks/use-themes";
import { useCreateBooking } from "@/hooks/use-bookings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";
import { api } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Loader2, MessageSquare, CalendarCheck } from "lucide-react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function BookingCreate() {
  const [location, setLocation] = useLocation();
  const { data: themes = [], isLoading: isLoadingThemes } = useThemes();
  const { mutateAsync: createBooking, isPending: isBookingPending } = useCreateBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine mode from URL: ?type=enquiry
  const searchParams = new URLSearchParams(window.location.search);
  const initialDate = searchParams.get('date') || "";
  const isEnquiryMode = searchParams.get('type') === 'enquiry';

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    startDate: initialDate,
    endDate: initialDate,
    themeId: "",
    totalAmount: "",
    advancePaid: "",
    notes: ""
  });

  const createEnquiry = useMutation({
    mutationFn: async (data: { name: string; phone: string; startDate: string; endDate: string; notes: string }) => {
      const res = await fetchWithAuth(api.enquiries.create.path, {
        method: api.enquiries.create.method,
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create enquiry");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.enquiries.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.calendar.list.path] });
      toast({ title: "Enquiry created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create enquiry", description: err.message, variant: "destructive" });
    }
  });

  const isPending = isEnquiryMode ? createEnquiry.isPending : isBookingPending;
  const balance = Number(formData.totalAmount || 0) - Number(formData.advancePaid || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = formData.phone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^(?:\+?91|0)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end < start) {
        toast({
          title: "Invalid Dates",
          description: "End Date cannot be before Start Date.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isEnquiryMode) {
      await createEnquiry.mutateAsync({
        name: formData.customerName,
        phone: formData.phone,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        notes: formData.notes,
      });
      setLocation("/enquiries");
    } else {
      const totalAmount = Number(formData.totalAmount);
      const advancePaid = Number(formData.advancePaid);

      if (advancePaid > totalAmount) {
        toast({
          title: "Invalid Amount",
          description: "Advance Paid cannot be greater than Total Amount",
          variant: "destructive",
        });
        return;
      }

      await createBooking({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        themeId: formData.themeId ? Number(formData.themeId) : null,
        totalAmount,
        advancePaid,
      });
      setLocation("/bookings");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(isEnquiryMode ? "/enquiries" : "/home")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {isEnquiryMode ? "New Enquiry" : "Create Reservation"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEnquiryMode ? "Record a customer enquiry for follow-up" : "Book the hall for a new event"}
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden"
      >
        <div className={`h-2 w-full ${isEnquiryMode ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400' : 'bg-gradient-to-r from-primary via-accent to-primary'}`} />

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">

          {/* Section 1: Customer Details */}
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isEnquiryMode ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'}`}>1</span>
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name</Label>
                <Input
                  id="customerName"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  className="h-12 bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 bg-muted/30"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50 w-full" />

          {/* Section 2: Event Details */}
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isEnquiryMode ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'}`}>2</span>
              Event Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e => {
                    const newStart = e.target.value;
                    let newEnd = formData.endDate;
                    if (newEnd && newStart && new Date(newEnd) < new Date(newStart)) {
                      newEnd = newStart;
                    }
                    setFormData({ ...formData, startDate: newStart, endDate: newEnd });
                  }}
                  className="h-12 bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  required
                  min={formData.startDate}
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-12 bg-muted/30"
                />
              </div>

              {formData.startDate && formData.endDate && (
                <div className="md:col-span-2 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-primary flex items-start gap-3 mt-2">
                  <CalendarCheck className="w-5 h-5 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Availability Note:</strong> The hall will be available to the customer from{' '}
                    <strong>
                      {format(subDays(new Date(formData.startDate), 1), "MMM d, yyyy")} at 4:00 PM
                    </strong>{' '}
                    until{' '}
                    <strong>
                      {format(new Date(formData.endDate), "MMM d, yyyy")} at 4:00 PM
                    </strong>.
                    <br />
                    <span className="text-muted-foreground mt-1 block">The calendar will solely block the selected dates.</span>
                  </p>
                </div>
              )}

              {/* Theme selector - only for bookings */}
              {!isEnquiryMode && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Decoration Theme <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Select disabled={isLoadingThemes} value={formData.themeId} onValueChange={(val) => setFormData({ ...formData, themeId: val })}>
                    <SelectTrigger className="h-12 bg-muted/30">
                      <SelectValue placeholder={isLoadingThemes ? "Loading themes..." : "Select a theme for the event"} />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">{isEnquiryMode ? "Enquiry Notes" : "Special Requests / Notes"}</Label>
                <Textarea
                  id="notes"
                  placeholder={isEnquiryMode ? "What is the customer interested in? Any specific requirements..." : "Any specific catering or seating arrangements..."}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="resize-none h-24 bg-muted/30"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financials - only for bookings */}
          {!isEnquiryMode && (
            <>
              <div className="h-px bg-border/50 w-full" />
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">3</span>
                  Financials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={formData.totalAmount}
                      onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                      className="h-12 bg-muted/30 text-lg font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advancePaid">Advance Paid (₹)</Label>
                    <Input
                      id="advancePaid"
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={formData.advancePaid}
                      onChange={e => setFormData({ ...formData, advancePaid: e.target.value })}
                      className="h-12 bg-muted/30 text-lg font-semibold text-green-600"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col justify-center h-auto min-h-12 mb-0">
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Balance Left</span>
                    <span className={`text-xl font-bold font-display ${balance > 0 ? 'text-destructive' : 'text-primary'}`}>
                      ₹{balance > 0 ? balance.toLocaleString() : "0"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className={`h-12 px-8 text-base font-semibold shadow-lg transition-all hover-elevate ${isEnquiryMode
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-600/25'
                : 'shadow-primary/25 hover:shadow-xl'
                }`}
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : isEnquiryMode ? (
                <MessageSquare className="w-5 h-5 mr-2" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {isEnquiryMode ? "Submit Enquiry" : "Confirm Reservation"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
