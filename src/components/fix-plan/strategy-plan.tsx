import React from 'react';
import { Badge } from "../ui/badge";
import { Loader } from "lucide-react";

interface StrategyPlanProps {
  strategyPlan?: string;
  isFixPlanLoading?: boolean;
}

const StrategyPlan = ({ strategyPlan, isFixPlanLoading }: StrategyPlanProps) => {
  const renderStrategyContent = () => {
    if (!strategyPlan && isFixPlanLoading) {
      return (
        <div className="flex items-center gap-2 my-2 p-4 bg-muted rounded-md">
          <Loader className="animate-spin h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            Generating implementation strategy...
          </span>
        </div>
      );
    }

    if (!strategyPlan) {
      return (
        <div className="p-4 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            Implementation strategy not yet generated...
          </span>
        </div>
      );
    }

    if (strategyPlan.startsWith("ERROR:")) {
      return (
        <div className="p-4 bg-destructive/10 rounded-md">
          <span className="text-sm text-destructive">
            {strategyPlan.replace("ERROR:", "")}
          </span>
        </div>
      );
    }

    try {
      const parsedStrategy = JSON.parse(strategyPlan);
      
      return (
        <div className="space-y-6 p-4">
          {Object.entries(parsedStrategy).map(([section, data]) => (
            <div key={section} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg capitalize">
                  {section.replace(/_/g, ' ')}
                </h3>
                <Badge variant="outline">Section</Badge>
              </div>
              <div className="bg-muted p-4 rounded-md border-l-4 border-primary">
                {typeof data === 'object' ? (
                  <div className="space-y-2">
                    {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <h4 className="font-medium text-sm capitalize text-muted-foreground">
                          {key.replace(/_/g, ' ')}:
                        </h4>
                        <div className="text-sm pl-2">
                          {Array.isArray(value) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {value.map((item, index) => (
                                <li key={index} className="text-sm">
                                  {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                                </li>
                              ))}
                            </ul>
                          ) : typeof value === 'object' ? (
                            <pre className="text-xs whitespace-pre-wrap overflow-x-auto bg-background p-2 rounded">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-sm">{String(value)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm">{String(data)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } catch {
      return (
        <div className="p-4 bg-muted rounded-md">
          <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
            {strategyPlan}
          </pre>
        </div>
      );
    }
  };

  return (
    <div className="w-full space-y-4 sm:px-6">
      <div className="flex items-center">
        <h2 className="text-xl font-bold">Implementation Strategy</h2>
      </div>
      {renderStrategyContent()}
    </div>
  );
}

export default StrategyPlan