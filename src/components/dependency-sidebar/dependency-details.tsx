import {
  Dependency,
  ShowMoreDescProps,
  ShowMoreRefsProps,
  Vulnerability,
} from "@/constants/constants";
import React, { useState } from "react";
import toast from "react-hot-toast";
import removeMarkdown from "remove-markdown";
import { Badge } from "../ui/badge";
import { Copy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProcessedVulnerability extends Vulnerability {
  groupedRefs: { [type: string]: string[] };
}

interface DependencyDetailsProps {
  processedVulns?: ProcessedVulnerability[];
  allDetails?: Dependency | undefined;
  transitiveNodeDetails?: Dependency | undefined;
  matchedTransitiveNode?: Dependency | undefined;
  isMobile?: boolean;
  getSeverityBadge: (score: string) => React.ReactNode;
}

const DependencyDetails = (props: DependencyDetailsProps) => {
  const {
    processedVulns,
    allDetails,
    transitiveNodeDetails,
    isMobile,
    getSeverityBadge,
  } = props;

  const [showMoreRefs, setShowMoreRefs] = useState<ShowMoreRefsProps>({});
  const [showMoreDesc, setShowMoreDesc] = useState<ShowMoreDescProps>({});

  return (
    <div className="px-4 ">
      {processedVulns && processedVulns.length > 0 ? (
        <div className={"space-y-2"}>
          {processedVulns?.map((vuln, index) => (
            <div key={index} className="border-b border-accent">
              <p
                className={cn(
                  isMobile ? "text-sm" : "text-md",
                  "text-accent font-bold"
                )}
              >
                {vuln.summary
                  ? removeMarkdown(vuln.summary.toTitleCase(), {
                      replaceLinksWithURL: true,
                      useImgAltText: true,
                      gfm: true,
                    })
                  : "No summary available"}
              </p>
              <p className="text-xs font-medium pb-2">
                <span className="text-xs italic text-muted-foreground">
                  {allDetails?.filePath
                    ? allDetails?.filePath
                    : transitiveNodeDetails?.filePath}
                </span>
              </p>
              <p>
                {vuln.fixAvailable ? (
                  <Badge
                    className={cn(
                      isMobile ? "text-xs" : "text-sm",
                      "bg-green-600 text-white rounded-sm -m-0.5 mb-2"
                    )}
                  >
                    Fix Available from v{vuln.fixAvailable}
                  </Badge>
                ) : (
                  <Badge
                    className={cn(
                      isMobile ? "text-xs" : "text-sm",
                      "bg-red-500 text-white rounded-sm -m-0.5 mb-2"
                    )}
                  >
                    No Fix Available
                  </Badge>
                )}
              </p>
              <div className="">
                <p
                  className={cn(
                    isMobile ? "text-xs" : "text-sm",
                    "text-input pb-2"
                  )}
                >
                  {vuln.details ? (
                    vuln.details.length > 200 ? (
                      showMoreDesc[index] ? (
                        <>
                          {removeMarkdown(vuln.details, {
                            replaceLinksWithURL: true,
                            useImgAltText: true,
                            gfm: true,
                          })}
                          <br />
                          <span
                            className="text-accent cursor-pointer font-semibold"
                            onClick={() =>
                              setShowMoreDesc((prev) => ({
                                ...prev,
                                [index]: !prev[index],
                              }))
                            }
                          >
                            Show less
                          </span>
                        </>
                      ) : (
                        <>
                          {removeMarkdown(vuln.details, {
                            replaceLinksWithURL: true,
                            useImgAltText: true,
                            gfm: true,
                          }).slice(0, 200)}
                          ...
                          <span
                            className="text-accent cursor-pointer font-semibold"
                            onClick={() =>
                              setShowMoreDesc((prev) => ({
                                ...prev,
                                [index]: !prev[index],
                              }))
                            }
                          >
                            {" "}
                            Show more
                          </span>
                        </>
                      )
                    ) : (
                      removeMarkdown(vuln.details, {
                        replaceLinksWithURL: true,
                        useImgAltText: true,
                        gfm: true,
                      })
                    )
                  ) : (
                    "No details available"
                  )}
                </p>
                {vuln.id && (
                  <div>
                    <p
                      className={cn(
                        isMobile ? "text-sm" : "text-md",
                        "font-bold text-input pb-2"
                      )}
                    >
                      Vulnerability ID:
                    </p>
                    <div className="flex flex-row items-center gap-x-2">
                      <p className={cn(isMobile ? "text-xs" : "text-sm")}>
                        {vuln.id}
                      </p>
                      <p>
                        <Copy
                          className="cursor-pointer"
                          size={16}
                          onClick={() => {
                            navigator.clipboard.writeText(vuln.id);
                            toast.success(
                              "Vulnerability ID copied to clipboard"
                            );
                          }}
                        />
                      </p>
                    </div>
                  </div>
                )}
                {vuln.severityScore && (
                  <div className="text-muted-foreground py-2">
                    <p
                      className={cn(
                        isMobile ? "text-sm" : "text-md",
                        "font-semibold text-accent"
                      )}
                    >
                      Severity
                    </p>
                    <p
                      className={cn(
                        isMobile ? "text-xs" : "text-sm",
                        "font-medium mb-1"
                      )}
                    >
                      CVSS V3 Score: {"   "}
                      {getSeverityBadge(
                        vuln.severityScore.cvss_v3 ?? "unknown"
                      )}
                    </p>
                    <p
                      className={cn(
                        isMobile ? "text-xs" : "text-sm",
                        "font-medium"
                      )}
                    >
                      CVSS V4 Score: {"   "}
                      {getSeverityBadge(
                        vuln.severityScore.cvss_v4 ?? "unknown"
                      )}
                    </p>
                  </div>
                )}
                {vuln.references && vuln.references.length > 0 && (
                  <div className="text-muted-foreground">
                    <p
                      className={cn(
                        isMobile ? "text-sm" : "text-md",
                        "font-semibold text-accent"
                      )}
                    >
                      References:
                    </p>
                    {Object.entries(vuln.groupedRefs).map(([type, urls]) => (
                      <div key={type} className="mb-2">
                        <div>
                          <p className="font-semibold text-sm text-input">
                            {type.slice(0, 1) + type.slice(1).toLowerCase()}:
                          </p>
                          {(showMoreRefs[type] ? urls : urls.slice(0, 3)).map(
                            (url, refIndex) => (
                              <div
                                key={refIndex}
                                className="whitespace-normal break-all text-xs mb-1"
                              >
                                <Link
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    isMobile ? "text-xs" : "text-sm",
                                    "text-muted-foreground hover:underline"
                                  )}
                                >
                                  {url}
                                </Link>
                              </div>
                            )
                          )}
                        </div>
                        {urls.length > 3 && (
                          <span
                            onClick={() =>
                              setShowMoreRefs((prev) => ({
                                ...prev,
                                [type]: !prev[type],
                              }))
                            }
                            className="cursor-pointer text-sm text-accent hover:underline"
                          >
                            {showMoreRefs[type] ? "Show less" : "Show more..."}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No vulnerabilities found for this dependency.
        </p>
      )}
    </div>
  );
};

export default DependencyDetails;
