import { useLocation } from "wouter";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, User, Building2, HardHat, ChevronRight } from "lucide-react";

import entryIndividualImg from "@/assets/images/entry-individual-photo.jpg";
import entryOrganisationImg from "@/assets/images/entry-organisation-photo.jpg";
import entryLoneWorkerImg from "@/assets/images/entry-lone-worker-photo.jpg";

const options = [
  {
    key: "individual" as const,
    path: "/individual",
    icon: User,
    title: "Personal Safety",
    description: "Check-ins, emergency alerts, and wellness tools to keep you and your loved ones connected.",
    image: entryIndividualImg,
  },
  {
    key: "organisations" as const,
    path: "/organisations",
    icon: Building2,
    title: "Safeguarding & Compliance for Organisations",
    description: "Client monitoring, audit trails, and assurance dashboards for care homes, charities, and housing associations.",
    image: entryOrganisationImg,
  },
  {
    key: "lone-worker" as const,
    path: "/lone-worker",
    icon: HardHat,
    title: "Lone Worker Safety",
    description: "Automatic check-ins, supervisor monitoring, and escalation for people who work alone.",
    image: entryLoneWorkerImg,
  },
];

export default function EntrySelect() {
  const [, navigate] = useLocation();

  const handleSelect = (key: string, path: string) => {
    localStorage.setItem("aok_landing_type", key);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShieldCheck className="h-7 w-7 sm:h-9 sm:w-9 text-green-600" aria-label="aok shield logo" />
            <span className="text-lg sm:text-2xl font-bold text-green-600">aok</span>
          </div>
          <Link href="/login">
            <Button size="sm" data-testid="button-sign-in">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl md:text-5xl font-bold mb-3 leading-tight">
            How will you use <span className="text-green-600">aok</span>?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Choose the option that best describes you so we can tailor your experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.key}
                className="overflow-visible cursor-pointer hover-elevate active-elevate-2 transition-all"
                onClick={() => handleSelect(option.key, option.path)}
                data-testid={`card-entry-${option.key}`}
              >
                <CardContent className="p-0 flex flex-col">
                  <div className="w-full aspect-[4/3] overflow-hidden rounded-t-md">
                    <img
                      src={option.image}
                      alt={option.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-entry-${option.key}`}
                    />
                  </div>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/10 p-2">
                        <Icon className="h-5 w-5 text-green-600" />
                      </div>
                      <h2 className="text-lg font-semibold">{option.title}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">
                      {option.description}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full gap-2 mt-1"
                      data-testid={`button-learn-more-${option.key}`}
                    >
                      Learn More
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
