'use client';

import React, { useState, useEffect } from 'react';

export default function ClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setHasMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  if (!hasMounted) {
    return fallback;
  }

  return <>{children}</>;
}
