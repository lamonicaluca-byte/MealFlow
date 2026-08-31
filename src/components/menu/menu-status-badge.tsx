import type { MenuStatus } from "@/types/domain";
import { MENU_STATUS_LABELS } from "@/types/domain";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const VARIANT_BY_STATUS: Record<MenuStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  generated: "outline",
  pending_approval: "warning",
  approved: "success",
  modified_after_approval: "maiolica",
  archived: "secondary",
};

export function MenuStatusBadge({ status }: { status: MenuStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{MENU_STATUS_LABELS[status]}</Badge>;
}
