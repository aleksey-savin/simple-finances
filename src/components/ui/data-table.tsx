import * as React from 'react'
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Table as ReactTable,
  type Column,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

// ─── DataTable ────────────────────────────────────────────────────────────────

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** Render prop — receives the table instance to build a custom toolbar */
  toolbar?: (table: ReactTable<TData>) => React.ReactNode
  initialSorting?: SortingState
  /** Page sizes shown in the pagination dropdown.  Defaults to [10, 20, 50, 100] */
  pageSizes?: number[]
  defaultPageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  toolbar,
  initialSorting = [],
  pageSizes = [10, 20, 50, 100],
  defaultPageSize = 20,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState<string>('')
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    // Make global filter work across all string-valued columns
    globalFilterFn: 'includesString',
  })

  return (
    <div className="flex flex-col gap-4">
      {toolbar?.(table)}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width:
                        header.column.columnDef.size !== 150
                          ? header.column.columnDef.size
                          : undefined,
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                    }}
                    className={cn(
                      header.column.columnDef.meta?.headerClassName as
                        | string
                        | undefined,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.cellClassName as
                          | string
                          | undefined,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Ничего не найдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} pageSizes={pageSizes} />
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function DataTablePagination<TData>({
  table,
  pageSizes,
}: {
  table: ReactTable<TData>
  pageSizes: number[]
}) {
  const { pageIndex } = table.getState().pagination
  const pageCount = table.getPageCount()
  const total = table.getFilteredRowModel().rows.length

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
      <p className="text-muted-foreground">
        {total} {pluralRecords(total)}
      </p>

      <div className="flex items-center gap-4">
        {/* Page-size picker */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap">
            Строк:
          </span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page navigator */}
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground whitespace-nowrap mr-1">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Column header with sorting ───────────────────────────────────────────────

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={cn('text-sm font-medium', className)}>{title}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded text-sm font-medium',
        'hover:bg-muted/60 transition-colors select-none cursor-pointer',
        sorted && 'text-foreground',
        !sorted && 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5 shrink-0" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5 shrink-0" />
      ) : (
        <ArrowUpDown className="size-3.5 shrink-0 opacity-40" />
      )}
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pluralRecords(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'запись'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'записи'
  return 'записей'
}

// Augment TanStack Table's ColumnMeta so consumers can pass className hints
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}
