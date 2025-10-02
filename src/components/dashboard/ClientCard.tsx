"use client";

import { useState } from "react";
import { User, Mail, FileText, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { NewPlanModal } from "./NewPlanModal";

type ClientCardProps = {
  client: {
    userId: string;
    docId: string | null;
    notes: string | null;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    _count: {
      plans: number;
    };
  };
};

export function ClientCard({ client }: ClientCardProps) {
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [modalMode, setModalMode] = useState<"scratch" | "template">("scratch");

  const handleNewPlan = () => {
    setModalMode("scratch");
    setShowNewPlanModal(true);
  };

  const handleFromTemplate = () => {
    setModalMode("template");
    setShowNewPlanModal(true);
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {client.user.name || "Unnamed Client"}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" />
                {client.user.email}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {client._count.plans} {client._count.plans === 1 ? "plan" : "plans"}
            </Badge>
          </div>
        </CardHeader>

        {client.notes && (
          <CardContent>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="line-clamp-2">{client.notes}</p>
            </div>
          </CardContent>
        )}

        <CardFooter className="mt-auto flex flex-col gap-2">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleNewPlan}
            >
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleFromTemplate}
            >
              From Template
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              // TODO: Navigate to client plans view
              console.log("View plans for client:", client.userId);
            }}
          >
            View Plans
          </Button>
        </CardFooter>
      </Card>

      <NewPlanModal
        open={showNewPlanModal}
        onOpenChange={setShowNewPlanModal}
        clientId={client.userId}
        clientName={client.user.name || "Client"}
        mode={modalMode}
      />
    </>
  );
}
