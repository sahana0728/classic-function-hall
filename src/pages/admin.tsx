import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, Plus, UserPlus, Pencil, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Staff" });

  const { data: usersList = [], isLoading } = useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetchWithAuth(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    }
  });

  const createUser = useMutation({
    mutationFn: async (userData: typeof form) => {
      const res = await fetchWithAuth("/api/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User created successfully" });
      setIsAddOpen(false);
      setForm({ name: "", email: "", password: "", role: "Staff" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    }
  });

  const updateUser = useMutation({
    mutationFn: async (userData: typeof form) => {
      const res = await fetchWithAuth(`/api/users/${editingUserId}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User updated successfully" });
      setIsAddOpen(false);
      setEditingUserId(null);
      setForm({ name: "", email: "", password: "", role: "Staff" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'edit') {
      updateUser.mutate(form);
    } else {
      createUser.mutate(form);
    }
  };

  // ── Mobile Card View ──
  const renderMobileCards = () => (
    <div className="space-y-3 p-3">
      {usersList.map((user: any) => (
        <div key={user.id} className="mobile-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{user.name}</h3>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role === 'Admin'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary/20 text-secondary-foreground'
                }`}>
                {user.role}
              </span>
              <Button variant="ghost" size="sm" className="touch-target" onClick={() => {
                setMode('edit');
                setEditingUserId(user.id);
                setForm({ name: user.name, email: user.email, password: "", role: user.role });
                setIsAddOpen(true);
              }}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Desktop Table View ──
  const renderTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-semibold text-foreground">Name</TableHead>
            <TableHead className="font-semibold text-foreground">Email</TableHead>
            <TableHead className="font-semibold text-foreground">Role</TableHead>
            <TableHead className="font-semibold text-foreground text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usersList.map((user: any) => (
            <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  {user.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${user.role === 'Admin'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary/20 text-secondary-foreground'
                  }`}>
                  {user.role}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => {
                  setMode('edit');
                  setEditingUserId(user.id);
                  setForm({ name: user.name, email: user.email, password: "", role: user.role });
                  setIsAddOpen(true);
                }}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
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
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-3 md:p-4 rounded-2xl">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage system users and permissions</p>
          </div>
        </div>
        <Button onClick={() => { setMode('add'); setForm({ name: "", email: "", password: "", role: "Staff" }); setIsAddOpen(true); }} className="shadow-md shadow-primary/20 hover-elevate w-full sm:w-auto touch-target">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : usersList.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No users found.</p>
            <Button onClick={() => setIsAddOpen(true)} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Add your first user
            </Button>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {mode === 'add' ? 'Add New User' : 'Edit User'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input id="user-name" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" type="email" placeholder="john@classichall.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Password {mode === 'edit' && <span className="text-muted-foreground font-normal text-xs">(leave blank to keep unchanged)</span>}</Label>
              <Input id="user-password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={mode === 'add'} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <select
                id="user-role"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="pt-4 border-t border-border">
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending} className="w-full h-12 shadow-md touch-target">
                {createUser.isPending || updateUser.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'add' ? "Create User" : "Save Changes")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
