type ProfileLike = {
  display_name?: string | null;
};

type UserLike = {
  email?: string;
  profile?: {
    name?: string;
  } | null;
  metadata?: Record<string, unknown> | null;
};

export function getDisplayName(
  profile: ProfileLike | null | undefined,
  user: UserLike | null | undefined,
) {
  if (profile?.display_name) {
    return profile.display_name;
  }

  if (typeof user?.profile?.name === "string" && user.profile.name.length > 0) {
    return user.profile.name;
  }

  if (typeof user?.metadata?.name === "string" && user.metadata.name.length > 0) {
    return user.metadata.name;
  }

  if (user?.email) {
    return user.email.split("@")[0] ?? "User";
  }

  return "User";
}

export function getInitials(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return email?.slice(0, 2).toUpperCase() ?? "U";
}
