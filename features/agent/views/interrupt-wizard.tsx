import { Wrench, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation";

interface InterruptWizardProps {
  interrupt: {
    toolCall: any;
    sessionId: string;
  };
  onApprove: (action: "continue" | "update" | "feedback") => void;
  isGenerating: boolean;
  projects?: any[];
  avatars?: any;
  voices?: any;
  scripts?: any[];
  
  // Video render form states
  videoTitle: string;
  setVideoTitle: (t: string) => void;
  videoProject: string;
  setVideoProject: (p: string) => void;
  videoAvatar: string;
  setVideoAvatar: (a: string) => void;
  videoVoice: string;
  setVideoVoice: (v: string) => void;
  videoScript: string;
  setVideoScript: (s: string) => void;
}

export function InterruptWizard({
  interrupt,
  onApprove,
  isGenerating,
  projects,
  avatars,
  voices,
  scripts,
  videoTitle,
  setVideoTitle,
  videoProject,
  setVideoProject,
  videoAvatar,
  setVideoAvatar,
  videoVoice,
  setVideoVoice,
  videoScript,
  setVideoScript,
}: InterruptWizardProps) {
  const isVideoRender = interrupt.toolCall.name === "generate_video";

  return (
    <Confirmation
      state="approval-requested"
      approval={{ id: interrupt.toolCall.id }}
      className="mt-4 border-amber-500/30 bg-amber-500/5 p-4 shadow-sm rounded-xl font-outfit"
    >
      <ConfirmationTitle className="flex items-center gap-2 text-amber-600 font-semibold text-xs uppercase tracking-wider mb-2">
        <Wrench className="size-4 animate-bounce" />
        <span>Tool Approval Required: {interrupt.toolCall.name}</span>
      </ConfirmationTitle>

      <ConfirmationRequest>
        {isVideoRender ? (
          <div className="space-y-4 w-full">
            <div className="text-xs text-muted-foreground leading-relaxed">
              The agent wants to trigger a background composition job. Please review the parameter values below, choose the target assets, and confirm the execution block.
            </div>

            {/* Parameters editing wizard form */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1 w-full">
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Video Title</label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter rendering title"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Project Container</label>
                <Select value={videoProject} onValueChange={(v) => setVideoProject(v ?? "")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">AI Avatar Model</label>
                <Select value={videoAvatar} onValueChange={(v) => setVideoAvatar(v ?? "")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose Avatar" />
                  </SelectTrigger>
                  <SelectContent>
                    {avatars && [...(avatars.system || []), ...(avatars.custom || [])].map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.variant === 'system' ? 'System' : 'Custom'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Synthesized Voice</label>
                <Select value={videoVoice} onValueChange={(v) => setVideoVoice(v ?? "")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose Voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices && [...(voices.system || []), ...(voices.custom || [])].map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.variant === 'system' ? 'System' : 'Cloned'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Spoken Script</label>
                <Select value={videoScript} onValueChange={(v) => setVideoScript(v ?? "")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose Script" />
                  </SelectTrigger>
                  <SelectContent>
                    {scripts?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ConfirmationActions className="pt-2 border-t border-amber-500/10 w-full justify-end flex">
              <ConfirmationAction
                onClick={() => onApprove("feedback")}
                variant="ghost"
                className="h-8 text-red-500 hover:text-red-600 hover:bg-red-500/5 text-xs font-semibold"
                disabled={isGenerating}
              >
                <X className="size-3.5 mr-1" />
                Reject Render
              </ConfirmationAction>
              <ConfirmationAction
                onClick={() => onApprove("update")}
                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                disabled={isGenerating || !videoProject || !videoAvatar || !videoVoice || !videoScript}
              >
                <Check className="size-3.5 mr-1" />
                Confirm & Queue Render
              </ConfirmationAction>
            </ConfirmationActions>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            <div className="rounded border bg-background/50 p-2 text-xs font-mono overflow-auto max-h-32">
              {JSON.stringify(interrupt.toolCall.args, null, 2)}
            </div>
            <ConfirmationActions className="w-full justify-end flex">
              <ConfirmationAction
                onClick={() => onApprove("feedback")}
                variant="ghost"
                className="h-8 text-red-500 text-xs font-semibold"
                disabled={isGenerating}
              >
                Reject
              </ConfirmationAction>
              <ConfirmationAction
                onClick={() => onApprove("continue")}
                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                disabled={isGenerating}
              >
                Approve Action
              </ConfirmationAction>
            </ConfirmationActions>
          </div>
        )}
      </ConfirmationRequest>
    </Confirmation>
  );
}
