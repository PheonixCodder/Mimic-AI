import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AgentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AgentErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-red-500/20 bg-red-500/5 rounded-xl space-y-3 font-outfit">
          <AlertOctagon className="size-8 text-red-500" />
          <h4 className="font-semibold text-sm text-foreground">Failed to render message panel</h4>
          <p className="text-xs text-muted-foreground text-center max-w-md leading-relaxed">
            {this.state.error?.message || "An unexpected rendering error occurred in the message display component."}
          </p>
          <Button onClick={this.handleReset} variant="outline" size="sm" className="h-8 text-xs font-semibold">
            Reset Panel
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
