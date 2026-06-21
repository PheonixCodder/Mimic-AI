import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
}

export function useJobStatus(jobId: string | null) {
  const queryClient = useQueryClient();
  const [job, setJob] = useState<Job | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    
    const pollStatus = async () => {
      try {
        // Use fetch instead of tRPC for polling
        const response = await fetch(`/api/trpc/jobs.getById?input=${encodeURIComponent(JSON.stringify({ json: { id: jobId } }))}`);
        const data = await response.json();
        
        if (data.result?.data?.json) {
          const result = data.result.data.json;
          setJob(result);
          
          // Stop polling if job is finished
          if (['completed', 'failed', 'cancelled'].includes(result.status)) {
            setIsPolling(false);
            return false; // Stop interval
          }
        }
        return true; // Continue interval
      } catch (error) {
        console.error('Failed to poll job status:', error);
        setIsPolling(false);
        return false; // Stop interval
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds while job is active
    const interval = setInterval(async () => {
      const shouldContinue = await pollStatus();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [jobId]);

  return {
    job,
    isPolling,
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    stage: job?.metadata?.stage,
    progress: job?.progress || 0
  };
}