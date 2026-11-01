import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { useGridColumns } from "@/hooks/use-grid-columns";

// Column counts must match COLUMN_BREAKPOINTS in use-grid-columns.ts.
export const PHOTO_GRID_CLASSES =
  "grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5 lg:grid-cols-6";

interface PhotoGridProps<T extends { id: string }> {
  photos: T[];
  renderPhoto: (photo: T, index: number) => ReactNode;
  /** Use a fixed number of columns instead of the responsive count, e.g. for half-width cards. */
  fixedColumns?: number;
}

const PhotoGrid = <T extends { id: string }>({ photos, renderPhoto, fixedColumns }: PhotoGridProps<T>) => {
  const responsiveColumns = useGridColumns();
  const columns = fixedColumns ?? responsiveColumns;
  const [isExpanded, setIsExpanded] = useState(false);

  const hiddenCount = photos.length - columns;
  const visiblePhotos = isExpanded ? photos : photos.slice(0, columns);

  return (
    <div>
      <div
        className={fixedColumns ? "grid gap-2 sm:gap-2.5" : PHOTO_GRID_CLASSES}
        style={fixedColumns ? { gridTemplateColumns: `repeat(${fixedColumns}, minmax(0, 1fr))` } : undefined}
      >
        {visiblePhotos.map((photo, index) => renderPhoto(photo, index))}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-full text-xs"
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                View more ({hiddenCount})
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid;
