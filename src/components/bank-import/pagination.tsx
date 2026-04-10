import { Button } from '#/components/ui/button'
import { Combobox } from '#/components/ui/combobox'

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
          <Combobox
            options={[
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            value={String(pageSize)}
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as 25 | 50 | 100)
            }
            placeholder="Размер"
            className="w-24"
          />
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
