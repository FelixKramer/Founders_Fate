import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type CustomModelRow = {
  id: string;
  name: string;
  description: string | null;
  qualityScore: number | null;
  sourceType: string;
  scenarioJson: unknown;
};

interface CustomModelsSectionProps {
  models: CustomModelRow[];
}

/**
 * Displays a user's ready custom domain models as scenario-style cards in the hub.
 * Only models with status=ready and qualityScore>=0.7 are passed here by the
 * server component.
 */
export function CustomModelsSection({ models }: CustomModelsSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((model) => {
        const scenario = model.scenarioJson as Record<string, unknown> | null;
        const title = (scenario?.title as string) ?? model.name;
        const description =
          (scenario?.description as string) ?? model.description ?? "";
        const scoreDisplay = model.qualityScore
          ? `${(model.qualityScore * 100).toFixed(0)}% quality`
          : null;

        return (
          <Link
            key={model.id}
            href={`/sim/new/custom-${model.id}`}
            className="block group"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="pt-5 pb-4 flex flex-col gap-2 h-full">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold leading-snug line-clamp-2">
                    {title}
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                  >
                    Custom
                  </Badge>
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {description}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <Badge variant="secondary" className="text-xs">
                    {model.sourceType.toUpperCase()}
                  </Badge>
                  {scoreDisplay && (
                    <span className="text-xs text-muted-foreground">
                      {scoreDisplay}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
