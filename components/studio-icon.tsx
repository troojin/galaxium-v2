import React from "react";

const ICON_BASE = "/assistant/StudioIcons";
const FALLBACK_ICON = "Instance";

export function getStudioIconPath(className: string): string {
  return `${ICON_BASE}/${className}.png`;
}

interface StudioIconProps {
  className: string;
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
}

export function StudioIcon({ className, size = 16, alt, style }: StudioIconProps) {
  const [src, setSrc] = React.useState(() => getStudioIconPath(className));
  const [triedFallback, setTriedFallback] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setSrc(getStudioIconPath(className));
    setTriedFallback(false);
    setFailed(false);
  }, [className]);

  function handleError() {
    if (!triedFallback) {
      setTriedFallback(true);
      setSrc(getStudioIconPath(FALLBACK_ICON));
    } else {
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: 3,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
          ...style,
        }}
        title={className}
      />
    );
  }

  return (
    <img
      src={src}
      onError={handleError}
      width={size}
      height={size}
      alt={alt ?? className}
      title={className}
      style={{ display: "block", flexShrink: 0, imageRendering: "pixelated", ...style }}
    />
  );
}