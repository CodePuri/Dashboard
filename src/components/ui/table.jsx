"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

function TableHead({
  className,
  sortDirection,
  onSort,
  onResize,
  width,
  children,
  ...props
}) {
  const [isResizing, setIsResizing] = React.useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent sort toggle when starting resize
    setIsResizing(true);

    const startX = e.pageX;
    const startWidth = width || e.currentTarget.parentElement.offsetWidth;

    const handleMouseMove = (moveEvent) => {
      if (onResize) {
        const delta = moveEvent.pageX - startX;
        onResize(Math.max(50, startWidth + delta));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <th
      data-slot="table-head"
      data-sortable={onSort ? "true" : "false"}
      style={{
        width: width ? `${width}px` : undefined,
        minWidth: width ? `${width}px` : undefined,
        maxWidth: width ? `${width}px` : undefined,
      }}
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap relative group/head",
        onSort &&
          "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        className,
      )}
      onClick={onSort}
      {...props}
    >
      <div className="flex items-center gap-1.5 min-w-0 h-full">
        <span className="truncate flex-1">{children}</span>
        {onSort && (
          <span className="flex-shrink-0 opacity-40 group-hover/head:opacity-100 transition-opacity">
            {sortDirection === "asc" ? (
              <ArrowUp className="h-2.5 w-2.5 text-foreground" />
            ) : sortDirection === "desc" ? (
              <ArrowDown className="h-2.5 w-2.5 text-foreground" />
            ) : (
              <ArrowUpDown className="h-2.5 w-2.5 text-muted-foreground/50 hover:text-foreground transition-colors" />
            )}
          </span>
        )}
      </div>
      {onResize && (
        <div
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-30",
            isResizing && "bg-primary w-0.5",
          )}
        />
      )}
    </th>
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
