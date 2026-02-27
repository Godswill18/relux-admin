import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, Phone, MapPin } from "lucide-react";

const staffMembers = [
  { id: 1, name: "John Smith", role: "Manager", email: "john.smith@maxygrand.com", phone: "+1 234 567 8901", branch: "Downtown Branch", active: true },
  { id: 2, name: "Sarah Johnson", role: "Receptionist", email: "sarah.j@maxygrand.com", phone: "+1 234 567 8902", branch: "Airport Branch", active: true },
  { id: 3, name: "Michael Brown", role: "Cleaner", email: "michael.b@maxygrand.com", phone: "+1 234 567 8903", branch: "Downtown Branch", active: true },
  { id: 4, name: "Emily Davis", role: "Waiter", email: "emily.d@maxygrand.com", phone: "+1 234 567 8904", branch: "Beach Branch", active: true },
  { id: 5, name: "David Wilson", role: "Receptionist", email: "david.w@maxygrand.com", phone: "+1 234 567 8905", branch: "City Center", active: false },
  { id: 6, name: "Lisa Anderson", role: "Cleaner", email: "lisa.a@maxygrand.com", phone: "+1 234 567 8906", branch: "Airport Branch", active: true },
];

const roleColors: Record<string, string> = {
  Manager: "bg-primary text-primary-foreground",
  Receptionist: "bg-secondary text-secondary-foreground",
  Cleaner: "bg-info text-info-foreground",
  Waiter: "bg-warning text-warning-foreground",
};

export default function Staffs() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage all hotel staff across branches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffMembers.map((staff, index) => (
          <Card key={staff.id} className="hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{staff.name}</h3>
                  <Badge className={`mt-1 ${roleColors[staff.role]}`}>{staff.role}</Badge>
                </div>
                <Switch checked={staff.active} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{staff.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{staff.branch}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
