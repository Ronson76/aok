import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Mail, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PageHeaderProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export function PageHeader({ title, rightContent }: PageHeaderProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareUrl = "https://aok.care";
    const shareText = "Stay connected with aok — a personal check-in app that notifies your emergency contacts if you miss a check-in.";
    
    // Try Web Share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "aok - Personal Check-in App",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard. Paste it in a text or email.",
      });
    } catch (err) {
      toast({
        title: "Unable to share",
        description: "Please copy this link: " + shareUrl,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex-1">
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-menu">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare} data-testid="button-share">
              <Share2 className="h-4 w-4 mr-2" />
              Share aok
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="mailto:support@aok.app" className="flex items-center gap-2" data-testid="link-contact-us">
                <Mail className="h-4 w-4" />
                Contact Us
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
