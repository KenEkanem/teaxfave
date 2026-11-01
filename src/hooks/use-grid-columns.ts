import * as React from "react";

// Keep in sync with PHOTO_GRID_CLASSES in PhotoGrid.tsx (Tailwind sm/md/lg breakpoints).
const COLUMN_BREAKPOINTS = [
  { minWidth: 1024, columns: 6 },
  { minWidth: 768, columns: 5 },
  { minWidth: 640, columns: 4 },
];
const BASE_COLUMNS = 3;

function getColumns() {
  if (typeof window === "undefined") {
    return BASE_COLUMNS;
  }

  return COLUMN_BREAKPOINTS.find(({ minWidth }) => window.innerWidth >= minWidth)?.columns ?? BASE_COLUMNS;
}

export function useGridColumns() {
  const [columns, setColumns] = React.useState(getColumns);

  React.useEffect(() => {
    const queries = COLUMN_BREAKPOINTS.map(({ minWidth }) => window.matchMedia(`(min-width: ${minWidth}px)`));
    const onChange = () => setColumns(getColumns());

    queries.forEach((query) => query.addEventListener("change", onChange));
    onChange();
    return () => queries.forEach((query) => query.removeEventListener("change", onChange));
  }, []);

  return columns;
}
