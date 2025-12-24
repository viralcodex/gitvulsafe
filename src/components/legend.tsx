import React from "react";
import { Card } from "./ui/card";

const Legend = () => {
  return (
    <div className="flex flex-row items-center justify-center mt-3" role="region" aria-label="CVSS score legend">
      <Card className="p-3 shadow-md bg-background border border-accent flex flex-row text-xs text-accent rounded-t-xl rounded-b-none" role="list">
        <div className="flex flex-row items-center" role="listitem">
          <span className="inline-block w-2 h-2 rounded-full bg-[#e53935] mr-2" aria-hidden="true"></span>
          <span>Critical CVSS score</span>
        </div>
        <div className="flex flex-row items-center" role="listitem">
          <span className="inline-block w-2 h-2 rounded-full bg-[#f17a5c] mr-2" aria-hidden="true"></span>
          <span>High CVSS score</span>
        </div>
        <div className="flex flex-row items-center" role="listitem">
          <span className="inline-block w-2 h-2 rounded-full bg-[#ffab2d] mr-2" aria-hidden="true"></span>
          <span>Medium CVSS score</span>
        </div>
        <div className="flex flex-row items-center" role="listitem">
          <span className="inline-block w-2 h-2 rounded-full bg-[#58b368] mr-2" aria-hidden="true"></span>
          <span>Low CVSS score</span>
        </div>
      </Card>
    </div>
  );
};

export default Legend;
