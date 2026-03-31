import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export function BankImportPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}: {
  currentPage: number
  totalPages: number
  total: number
  pageSize: 25 | 50 | 100
  onPageSizeChange: (value: 25 | 50 | 100) => void
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Страница {currentPage} из {totalPages} · всего страниц {totalPages} ·
        всего записей {total}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">На странице</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as 25 | 50 | 100)
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
        >
          Вперёд
        </Button>
      </div>
    </div>
  )
}
