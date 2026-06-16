import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/images/logo.svg";

type LogoProps = {
  className?: string;
  width?: number;
  height?: number;
  href?: string | null;
  priority?: boolean;
};

export function Logo({
  className,
  width = 46,
  height = 40,
  href = "/",
  priority = false,
}: LogoProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt="mimic-ai"
      width={width}
      height={height}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {image}
      </Link>
    );
  }

  return image;
}

export { LOGO_SRC };
