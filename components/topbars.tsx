"use client";

import React from "react";

interface TopbarProps {
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export default function Topbar({ center, right }: TopbarProps) {
  return (
    <header style={styles.topbar}>
      <div style={styles.side} />
      <div style={styles.center}>{center}</div>
      <div style={styles.side}>{right}</div>
    </header>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  topbar: {
    height: 58,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "0 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(10,10,10,0.82)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  center: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  side: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
};
