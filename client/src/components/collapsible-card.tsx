import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

interface CollapsibleCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerExtra?: ReactNode;
  testId?: string;
}

export function CollapsibleCard({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  className = "",
  headerExtra,
  testId,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={className} data-testid={testId}>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {headerExtra}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <CardContent className="space-y-4 pt-0">
          {children}
        </CardContent>
      </div>
    </Card>
  );
}
