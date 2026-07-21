import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, User, FileEdit, Trash2, CalendarPlus, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { api } from "@shared/routes";

interface AuditLog {
  id: number;
  action: string;
  entity_id: string;
  entity_type: string;
  performed_by: string;
  details: any;
  created_at: string;
}

export function AuditLogTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', entityType, entityId],
    queryFn: async () => {
      const url = api.auditLogs.get.path.replace(':entityType', entityType).replace(':entityId', entityId);
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return (await res.json()) as AuditLog[];
    },
    enabled: !!entityId && !!entityType
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed mt-4 bg-muted/10">
        <History className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm font-medium">No activity recorded yet.</p>
      </Card>
    );
  }

  const getActionInfo = (action: string) => {
    switch (action) {
      case 'CREATE_BOOKING':
        return { icon: CalendarPlus, color: 'text-primary', bg: 'bg-primary/10', label: 'Booking Created' };
      case 'CREATE_ENQUIRY':
        return { icon: CalendarPlus, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Enquiry Created' };
      case 'CONVERT_ENQUIRY':
        return { icon: CalendarPlus, color: 'text-green-600', bg: 'bg-green-100', label: 'Converted to Booking' };
      case 'UPDATE_BOOKING_NOTES':
        return { icon: FileEdit, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Notes Updated' };
      case 'ADD_PAYMENT':
        return { icon: FileEdit, color: 'text-green-600', bg: 'bg-green-100', label: 'Payment Added' };
      case 'ADD_DECORATION':
        return { icon: FileEdit, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Decoration Added' };
      case 'DELETE_DECORATION':
        return { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', label: 'Decoration Removed' };
      case 'DELETE_THEME':
        return { icon: Trash2, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Theme Deleted' };
      default:
        return { icon: History, color: 'text-muted-foreground', bg: 'bg-muted', label: action };
    }
  };

  return (
    <div className="mt-4 relative space-y-4">
      <div className="absolute top-4 bottom-4 left-[2.25rem] w-px bg-border/50" />
      
      {logs.map((log) => {
        const info = getActionInfo(log.action);
        const Icon = info.icon;
        
        return (
          <div key={log.id} className="relative flex gap-4 pr-4 pl-2 items-start group">
            <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center relative z-10 transition-transform group-hover:scale-105 shadow-sm border border-background ${info.bg} ${info.color}`}>
               <Icon className="w-6 h-6" />
            </div>
            <Card className="flex-1 p-4 shadow-sm border-border/50 group-hover:border-border transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-foreground text-sm">{info.label}</span>
                <span className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md">
                   {format(new Date(log.created_at), "MMM d, yyyy • h:mm a")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                 <User className="w-3.5 h-3.5" />
                 <span className="truncate">{log.performed_by}</span>
              </div>
              
              {/* Optional: Render details specifically based on the action if they exist */}
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-3 bg-muted/20 p-2.5 rounded-lg border border-border/30 text-xs text-muted-foreground">
                  {log.action === 'UPDATE_BOOKING_NOTES' ? (
                    <p className="line-clamp-2 italic">"{log.details.newNotes}"</p>
                  ) : log.action === 'CREATE_BOOKING' || log.action === 'CREATE_ENQUIRY' ? (
                     <p>For: <strong>{log.details.customerName || log.details.name}</strong> • Starts <strong>{format(new Date(log.details.startDate), "MMM d")}</strong></p>
                  ) : log.action === 'DELETE_DECORATION' ? (
                     <p>Removed Label: <strong>{log.details.label}</strong></p>
                  ) : log.action === 'ADD_DECORATION' ? (
                     <p>Added Decoration: <strong>{log.details.label}</strong></p>
                  ) : log.action === 'ADD_PAYMENT' ? (
                     <p>Amount: <strong className="text-green-600">₹{log.details.amount?.toLocaleString()}</strong> • Total Paid: <strong>₹{log.details.totalPaid?.toLocaleString()}</strong></p>
                  ) : log.action === 'CONVERT_ENQUIRY' ? (
                     <p>Converted from Enquiry • Customer: <strong>{log.details.customerName}</strong></p>
                  ) : (
                    <pre className="font-mono bg-transparent p-0 overflow-x-auto m-0 opacity-70">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
