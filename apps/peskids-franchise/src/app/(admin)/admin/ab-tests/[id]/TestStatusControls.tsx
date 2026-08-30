"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface TestStatusControlsProps {
  testId: string;
  currentStatus: string;
}

export default function TestStatusControls({
  testId,
  currentStatus,
}: TestStatusControlsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/ab-tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (error) {
      console.error("Status update error:", error);
      setAlertMsg("Failed to update test status");
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTest = () => {
    setShowDeleteConfirm(true);
  };

  const doDeleteTest = async () => {
    setShowDeleteConfirm(false);
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/ab-tests?id=${testId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete test");
      }

      router.push("/admin/ab-tests");
    } catch (error) {
      console.error("Delete error:", error);
      setAlertMsg("Failed to delete test");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus === "DRAFT" && (
        <Button
          onClick={() => updateStatus("RUNNING")}
          disabled={isUpdating}
          className="bg-brand-green hover:bg-brand-green/90"
        >
          Start Test
        </Button>
      )}

      {currentStatus === "RUNNING" && (
        <>
          <Button
            onClick={() => updateStatus("PAUSED")}
            disabled={isUpdating}
            variant="secondary"
            className="bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20"
          >
            Pause
          </Button>
          <Button
            onClick={() => updateStatus("COMPLETED")}
            disabled={isUpdating}
            variant="secondary"
          >
            Complete
          </Button>
        </>
      )}

      {currentStatus === "PAUSED" && (
        <>
          <Button
            onClick={() => updateStatus("RUNNING")}
            disabled={isUpdating}
            className="bg-brand-green hover:bg-brand-green/90"
          >
            Resume
          </Button>
          <Button
            onClick={() => updateStatus("COMPLETED")}
            disabled={isUpdating}
            variant="secondary"
          >
            Complete
          </Button>
        </>
      )}

      {currentStatus === "COMPLETED" && (
        <Button
          onClick={() => updateStatus("ARCHIVED")}
          disabled={isUpdating}
          variant="secondary"
        >
          Archive
        </Button>
      )}

      {(currentStatus === "DRAFT" || currentStatus === "ARCHIVED") && (
        <Button
          onClick={deleteTest}
          disabled={isUpdating}
          variant="secondary"
          className="text-red-500 hover:bg-red-50"
        >
          Delete
        </Button>
      )}
    </div>

    <ConfirmModal
      isOpen={showDeleteConfirm}
      title="Delete Test"
      message="Are you sure you want to delete this test? This action cannot be undone."
      confirmLabel="Delete"
      confirmVariant="danger"
      onConfirm={doDeleteTest}
      onCancel={() => setShowDeleteConfirm(false)}
    />

    <ConfirmModal
      isOpen={!!alertMsg}
      title="Notice"
      message={alertMsg || ""}
      confirmLabel="OK"
      cancelLabel=""
      confirmVariant="primary"
      onConfirm={() => setAlertMsg(null)}
      onCancel={() => setAlertMsg(null)}
    />
    </>
  );
}
