import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth, parseWithLogging } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, MessageSquare, Plus, ChevronRight, Calendar, Phone, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useDeleteEnquiry } from "@/hooks/use-enquiries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Enquiries() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const deleteEnquiry = useDeleteEnquiry();

  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: [api.enquiries.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.enquiries.list.path);
      if (!res.ok) throw new Error("Failed to fetch enquiries");
      const data = await res.json();
      return parseWithLogging(api.enquiries.list.responses[200], data, "enquiries.list");
    }
  });

  // Filter logic
  const filteredEnquiries = enquiries.filter((enquiry: any) => {
    const matchesSearch = 
      enquiry.name?.toLowerCase().includes(search.toLowerCase()) || 
      enquiry.phone?.includes(search) ||
      (enquiry.notes && enquiry.notes.toLowerCase().includes(search.toLowerCase()));

    let matchesDate = true;
    if (fromDate || toDate) {
      const start = enquiry.startDate ? new Date(enquiry.startDate).setHours(0,0,0,0) : null;
      const end = enquiry.endDate ? new Date(enquiry.endDate).setHours(0,0,0,0) : null;

      const filterStart = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
      const filterEnd = toDate ? new Date(toDate).setHours(0,0,0,0) : null;

      if (start && end) {
        if (filterStart && filterEnd) {
          matchesDate = start <= filterEnd && end >= filterStart;
        } else if (filterStart) {
          matchesDate = end >= filterStart;
        } else if (filterEnd) {
          matchesDate = start <= filterEnd;
        }
      } else if (start) {
        if (filterStart && filterEnd) {
          matchesDate = start >= filterStart && start <= filterEnd;
        } else if (filterStart) {
          matchesDate = start >= filterStart;
        } else if (filterEnd) {
          matchesDate = start <= filterEnd;
        }
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesDate;
  });

  // ── Mobile Card View ──
  const renderMobileCards = () => (
    <div className="space-y-3 p-3">
      {filteredEnquiries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground font-medium">No enquiries match the filters.</p>
        </div>
      ) : (
        filteredEnquiries.map((enquiry: any) => (
          <article
            key={enquiry.id}
            className="mobile-card w-full text-left border-l-4 border-l-yellow-400"
          >
            <button type="button" onClick={() => setLocation(`/enquiries/${enquiry.id}`)} className="flex w-full items-center justify-between text-left">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{enquiry.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{enquiry.phone}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
            <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {enquiry.startDate ? format(new Date(enquiry.startDate), "MMM d") : "—"} 
                  {" - "}
                  {enquiry.endDate ? format(new Date(enquiry.endDate), "MMM d") : "—"}
                </span>
              </div>
              {enquiry.notes && (
                <p className="text-xs text-muted-foreground truncate ml-auto max-w-[40%]">{enquiry.notes}</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setLocation(`/enquiries/${enquiry.id}`)} className="flex-1">
                View Details
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDeleteTarget({ id: enquiry.id, name: enquiry.name })}
                className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete enquiry from ${enquiry.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );

  // ── Desktop Table View ──
  const renderTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-yellow-50/50">
          <TableRow>
            <TableHead className="font-semibold text-foreground">Name</TableHead>
            <TableHead className="font-semibold text-foreground">Phone</TableHead>
            <TableHead className="font-semibold text-foreground">Start Date</TableHead>
            <TableHead className="font-semibold text-foreground">End Date</TableHead>
            <TableHead className="font-semibold text-foreground">Notes</TableHead>
            <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEnquiries.map((enquiry: any) => (
            <TableRow key={enquiry.id} className="hover:bg-yellow-50/30 transition-colors border-l-4 border-l-yellow-400">
              <TableCell className="font-medium">{enquiry.name}</TableCell>
              <TableCell className="text-muted-foreground">{enquiry.phone}</TableCell>
              <TableCell>{enquiry.startDate ? format(new Date(enquiry.startDate), "MMM d, yyyy") : "-"}</TableCell>
              <TableCell>{enquiry.endDate ? format(new Date(enquiry.endDate), "MMM d, yyyy") : "-"}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">{enquiry.notes || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLocation(`/enquiries/${enquiry.id}`)}
                    className="hover-elevate shadow-sm bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 font-semibold"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget({ id: enquiry.id, name: enquiry.name })}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete enquiry from ${enquiry.name}`}
                    title="Delete enquiry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div className="flex items-end gap-3">
          <div className="bg-gradient-to-br from-yellow-400/20 to-amber-500/20 p-3 md:p-4 rounded-2xl">
            <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Enquiries</h1>
            <p className="text-muted-foreground mt-1 text-sm">Customer enquiries and follow-ups</p>
          </div>
        </div>
        <Button onClick={() => setLocation("/booking/create?type=enquiry")} className="shadow-md shadow-yellow-600/20 hover-elevate bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto touch-target">
          <Plus className="w-4 h-4 mr-2" />
          New Enquiry
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 bg-muted/20 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, phone or notes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white h-11 rounded-xl"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[150px]">
            <span className="text-[9px] text-muted-foreground absolute left-3 top-1 font-semibold uppercase">From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="pl-3 pr-3 pt-3 bg-white h-11 rounded-xl text-xs"
            />
          </div>
          <div className="relative flex-1 sm:w-[150px]">
            <span className="text-[9px] text-muted-foreground absolute left-3 top-1 font-semibold uppercase">To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="pl-3 pr-3 pt-3 bg-white h-11 rounded-xl text-xs"
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="text-muted-foreground hover:text-foreground h-11 px-2 rounded-xl"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : isMobile ? renderMobileCards() : (
          filteredEnquiries.length === 0 ? (
            <div className="py-20 text-center"><p className="text-muted-foreground font-medium">No enquiries match the filters.</p></div>
          ) : renderTable()
        )}
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => {
        if (!open && !deleteEnquiry.isPending) setDeleteTarget(null);
      }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              The enquiry from <strong className="text-foreground">{deleteTarget?.name}</strong> will be permanently removed from the list and calendar. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEnquiry.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteEnquiry.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                deleteEnquiry.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }}
            >
              {deleteEnquiry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteEnquiry.isPending ? "Deleting…" : "Delete enquiry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
