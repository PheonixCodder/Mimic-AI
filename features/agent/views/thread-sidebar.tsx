import { Bot, Plus, Trash2, Sliders, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

interface Session {
  id: string;
  title: string;
}

interface ThreadSidebarProps {
  sessions?: Session[];
  activeSessionId: string | null;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (id: string) => void;
  isLoadingSessions: boolean;
  isCreatingSession: boolean;
  isGenerating: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  settingsChild: ReactNode;
}

export function ThreadSidebar({
  sessions,
  activeSessionId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  isLoadingSessions,
  isCreatingSession,
  isGenerating,
  showSettings,
  setShowSettings,
  settingsChild,
}: ThreadSidebarProps) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-r bg-muted/20">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-emerald-500 animate-pulse" />
          <h2 className="font-semibold text-sm tracking-tight font-outfit">Copilot Studio</h2>
        </div>
        <Button
          onClick={onCreateThread}
          size="sm"
          variant="outline"
          className="h-8 w-8 rounded-full p-0"
          disabled={isCreatingSession}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Scrollable threads list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoadingSessions ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Loading sessions...</span>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs font-outfit">
            No threads. Click + to begin.
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                if (!isGenerating) {
                  onSelectThread(s.id);
                }
              }}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border text-xs font-outfit ${
                activeSessionId === s.id
                  ? "bg-emerald-500/10 border-emerald-500/30 text-foreground font-medium"
                  : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
              } ${isGenerating ? "pointer-events-none opacity-80" : ""}`}
            >
              <div className="truncate flex-1 pr-2">{s.title}</div>
              <AlertDialog>
                <AlertDialogTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-0.5"
                >
                  <Trash2 className="size-3.5" />
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete conversation thread?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this conversation and all associated message history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(s.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>

      {/* Bottom Config Panel Trigger */}
      <div className="border-t p-3 bg-muted/40 font-outfit">
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="ghost"
          size="sm"
          className="w-full justify-between hover:bg-muted text-xs h-9 px-3"
        >
          <div className="flex items-center gap-2">
            <Settings className="size-3.5" />
            <span>BYOK & Model Settings</span>
          </div>
          <Sliders className={`size-3.5 transition-transform ${showSettings ? "rotate-90 text-primary" : ""}`} />
        </Button>

        {showSettings && settingsChild}
      </div>
    </div>
  );
}
