"use client";

import {
  Sparkles,
  Wallet,
  HeartPulse,
  Users,
  Home,
  CalendarDays,
  ListChecks,
  CircleCheck,
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Flame,
  Target,
  Repeat,
  Clock,
  Trash2,
  Pencil,
  TrendingUp,
  Sun,
  Moon,
  Settings,
  RefreshCw,
  Circle,
  CircleDot,
  Dot,
  Sunrise,
  Square,
  SquareCheck,
  CornerDownRight,
  GripVertical,
  ListTree,
  Link2,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Sparkles,
  Wallet,
  HeartPulse,
  Users,
  Home,
  CalendarDays,
  ListChecks,
  CircleCheck,
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Flame,
  Target,
  Repeat,
  Clock,
  Trash2,
  Pencil,
  TrendingUp,
  Sun,
  Moon,
  Settings,
  RefreshCw,
  Circle,
  CircleDot,
  Dot,
  Sunrise,
  Square,
  SquareCheck,
  CornerDownRight,
  GripVertical,
  ListTree,
  Link2,
  ExternalLink,
};

export function Icon({
  name,
  className,
  size,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Cmp = MAP[name] ?? Circle;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} />;
}
