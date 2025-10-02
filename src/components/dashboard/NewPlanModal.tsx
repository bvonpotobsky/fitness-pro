"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, FileText, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";

type NewPlanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  mode: "scratch" | "template";
};

export function NewPlanModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  mode,
}: NewPlanModalProps) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");

  // Fetch templates for the coach
  const { data: templates, isLoading: templatesLoading } =
    api.planTemplates.list.useQuery(undefined, {
      enabled: mode === "template" && open,
    });

  // Mutations
  const createPlanMutation = api.plans.create.useMutation({
    onSuccess: (data) => {
      toast.success("Plan created successfully!");
      onOpenChange(false);
      resetForm();
      router.refresh();
      // TODO: Navigate to plan editor
      console.log("Navigate to plan:", data.id);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create plan");
    },
  });

  const createFromTemplateMutation = api.plans.fromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success("Plan created from template!");
      onOpenChange(false);
      resetForm();
      router.refresh();
      // TODO: Navigate to plan editor
      console.log("Navigate to plan:", data.id);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create plan from template");
    },
  });

  const resetForm = () => {
    setSelectedTemplateId(null);
    setTitle("");
    setDateStart("");
    setDateEnd("");
    setMonthlyGoal("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateStart || !dateEnd) {
      toast.error("Please select start and end dates");
      return;
    }

    if (mode === "template") {
      if (!selectedTemplateId) {
        toast.error("Please select a template");
        return;
      }

      if (!title.trim()) {
        toast.error("Please enter a plan title");
        return;
      }

      createFromTemplateMutation.mutate({
        templateId: selectedTemplateId,
        clientId,
        title: title.trim(),
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
      });
    } else {
      if (!title.trim()) {
        toast.error("Please enter a plan title");
        return;
      }

      createPlanMutation.mutate({
        clientId,
        title: title.trim(),
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        monthlyGoal: monthlyGoal.trim() || undefined,
      });
    }
  };

  const isSubmitting =
    createPlanMutation.isPending || createFromTemplateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "template" ? "Create Plan from Template" : "Create New Plan"}
          </DialogTitle>
          <DialogDescription>
            Create a new fitness plan for {clientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "template" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              {templatesLoading ? (
                <div className="text-sm text-muted-foreground">
                  Loading templates...
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="grid gap-2 max-h-48 overflow-y-auto rounded-md border p-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                        selectedTemplateId === template.id
                          ? "border-primary bg-accent"
                          : ""
                      }`}
                    >
                      <FileText className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{template.title}</div>
                        {template.monthlyGoal && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {template.monthlyGoal}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground rounded-md border p-8 text-center">
                  No templates available. Create templates first.
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Plan Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., January 2025 - Strength Building"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="dateStart" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Start Date
              </label>
              <input
                id="dateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="dateEnd" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                End Date
              </label>
              <input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>
          </div>

          {mode === "scratch" && (
            <div className="space-y-2">
              <label htmlFor="monthlyGoal" className="text-sm font-medium flex items-center gap-1">
                <Target className="h-4 w-4" />
                Monthly Goal (optional)
              </label>
              <textarea
                id="monthlyGoal"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                placeholder="Describe the main objectives for this plan..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
