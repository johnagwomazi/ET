import { UserMinus, UserCog } from "lucide-react";

function getOrganizationMemberId(member) {
  const memberId = member?.id || member?._id || null;

  if (!memberId) {
    return null;
  }

  return String(memberId);
}

export function getOrganizationMemberDisplayName(member) {
  return member?.name || `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || "Unnamed member";
}

export function isProtectedOrganizationMember(member, currentUserId) {
  const memberId = getOrganizationMemberId(member);
  const normalizedCurrentUserId = currentUserId ? String(currentUserId) : null;

  return Boolean(member?.isPrimaryAdmin || (normalizedCurrentUserId && memberId && memberId === normalizedCurrentUserId));
}

export function buildOrganizationMemberActionItems(member, handlers, permissions, currentUserId) {
  const items = [];

  if (!member || isProtectedOrganizationMember(member, currentUserId)) {
    return items;
  }

  if (permissions?.canUpdateRole) {
    items.push({
      label: "Change role",
      icon: UserCog,
      onClick: () => handlers?.onChangeRole?.(member),
    });
  }

  if (permissions?.canRemoveMember) {
    items.push({
      label: "Remove member",
      icon: UserMinus,
      tone: "danger",
      onClick: () => handlers?.onRemove?.(member),
    });
  }

  return items;
}
