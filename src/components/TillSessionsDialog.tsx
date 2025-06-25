import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./ui/table";

// Icons
import { Clock, User, Store } from "lucide-react";

interface TillSessionsDialogProps {
  tillId: string;
  onClose: () => void;
}

export function TillSessionsDialog({ tillId, onClose }: TillSessionsDialogProps) {
  const sessions = useQuery(api.tills.getTillSessions, { tillId }) || [];

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Till Sessions - {tillId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {sessions.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Sign In</TableHead>
                      <TableHead>Sign Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {session.user?.name || "Unknown User"}
                              </div>
                              {session.user?.email && (
                                <div className="text-sm text-muted-foreground">
                                  {session.user.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(session.signInTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {session.signOutTime
                            ? new Date(session.signOutTime).toLocaleString()
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {session.sessionDuration
                              ? formatDuration(session.sessionDuration)
                              : session.isActive
                                ? formatDuration(Date.now() - session.signInTime)
                                : "-"
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.isActive ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Completed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Store className="h-8 w-8 text-muted-foreground" />
                  <div className="text-lg text-muted-foreground">No sessions found</div>
                  <p className="text-sm text-muted-foreground">
                    No users have signed into this till yet
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
