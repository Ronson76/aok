import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Mail } from "lucide-react";

interface PageHeaderProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export function PageHeader({ title, rightContent }: PageHeaderProps) {
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
