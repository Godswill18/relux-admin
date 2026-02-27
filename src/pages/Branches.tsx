import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MapPin, Users, Bed } from "lucide-react";

const branches = [
  { id: 1, name: "Downtown Branch", location: "123 Main St, City Center", manager: "John Smith", staff: 45, rooms: 80, active: true },
  { id: 2, name: "Airport Branch", location: "456 Airport Rd", manager: "Maria Garcia", staff: 38, rooms: 65, active: true },
  { id: 3, name: "Beach Branch", location: "789 Coastal Ave", manager: "David Chen", staff: 42, rooms: 70, active: true },
  { id: 4, name: "City Center", location: "321 Urban Plaza", manager: "Sarah Wilson", staff: 35, rooms: 55, active: true },
];

export default function Branches() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Branch Management</h1>
          <p className="text-muted-foreground">Manage all hotel branches and locations</p>
        </div>
        <Button>Add New Branch</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((branch, index) => (
          <Card key={branch.id} className="hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-xl text-foreground">{branch.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manager: {branch.manager}</p>
                </div>
                <Switch checked={branch.active} />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="h-4 w-4" />
                <span>{branch.location}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{branch.staff}</p>
                    <p className="text-xs text-muted-foreground">Staff</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{branch.rooms}</p>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
