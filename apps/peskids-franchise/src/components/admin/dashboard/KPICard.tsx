"use client";

import Link from "next/link";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/20/solid";
import { Card, CardContent } from "@/components/shared/Card";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  href?: string;
  color?: "navy" | "orange" | "cyan" | "green" | "purple" | "yellow";
  size?: "default" | "large";
}

const colorClasses = {
  navy: "text-brand-navy",
  orange: "text-brand-orange",
  cyan: "text-brand-cyan",
  green: "text-brand-green",
  purple: "text-brand-purple",
  yellow: "text-brand-yellow",
};

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  href,
  color = "navy",
  size = "default",
}: KPICardProps) {
  const content = (
    <CardContent className={size === "large" ? "py-5 sm:py-6" : "py-4 sm:py-5"}>
      <div className="text-xs sm:text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
        <span
          className={`${
            size === "large" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
          } font-bold ${colorClasses[color]}`}
        >
          {value}
        </span>
        {trend && (
          <span
            className={`flex items-center text-xs font-medium ${
              trend.value >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpIcon className="h-3 w-3 mr-0.5" />
            ) : (
              <ArrowDownIcon className="h-3 w-3 mr-0.5" />
            )}
            {Math.abs(trend.value)}%
            {trend.label && (
              <span className="text-gray-500 ml-1 font-normal">{trend.label}</span>
            )}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-[10px] sm:text-xs text-gray-500">{subtitle}</div>
      )}
      {href && (
        <div className="mt-2">
          <span className="text-[10px] sm:text-xs text-brand-purple hover:underline">
            View details &rarr;
          </span>
        </div>
      )}
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}
