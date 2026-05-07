import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export function PWAInstallPrompt() {
  const [evt, setEvt] = useState<Event | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("devant-pwa-dismissed")) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e);
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  if (!show || !evt) return null;

  const dismiss = () => {
    localStorage.setItem("devant-pwa-dismissed", "1");
    setShow(false);
  };

  const install = async () => {
    // @ts-expect-error - prompt is non-standard
    await evt.prompt();
    dismiss();
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 glass rounded-xl p-4 max-w-sm shadow-2xl animate-fade-up">
      <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <Logo withWordmark={false} />
        <div className="flex-1">
          <div className="font-display font-semibold text-sm">Install DevANT</div>
          <p className="text-xs text-muted-foreground mt-0.5">Get the best experience with our installable app.</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={install} className="gap-1.5">
              <Download className="size-3.5" /> Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Maybe later</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
