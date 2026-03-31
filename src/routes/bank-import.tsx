import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { BankImportList } from '#/components/bank-import/list'
import {
  BankImportAttachDialog,
  type BankImportAllocationDraft,
} from '#/components/bank-import/attach-dialog'
import {
  BankImportCreateDialog,
  type BankImportCreateDraft,
} from '#/components/bank-import/create-dialog'
import { BankImportDeleteDialog } from '#/components/bank-import/delete-dialog'
import { Card } from '#/components/ui/card'
import { BankImportFilters } from '#/components/bank-import/filters'
import { BankImportHeader } from '#/components/bank-import/header'
import { BankImportPagination } from '#/components/bank-import/pagination'
import {
  attachBankTransaction,
  createInvoiceFromBankTransaction,
  deleteBankTransaction,
  fetchBankImportContext,
  fetchImportedBankTransactions,
  importBankStatement,
  type ImportedBankTransactionView,
} from '#/components/bank-import/actions'
import { normalizeCounterpartyName } from '#/lib/bank-statement'

const bankImportSearchSchema = z.object({
  accountId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [25, 50, 100].includes(value), {
      message: 'Недопустимый размер страницы',
    })
    .default(25),
  search: z.string().default(''),
  direction: z.enum(['all', 'credit', 'debit']).default('all'),
  status: z.enum(['all', 'matched', 'partial', 'unmatched']).default('all'),
})

export const Route = createFileRoute('/bank-import')({
  validateSearch: (search) => bankImportSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    accountId: search.accountId,
    page: search.page,
    pageSize: search.pageSize,
    search: search.search,
    direction: search.direction,
    status: search.status,
  }),
  loader: async ({ deps }) => {
    const context = await fetchBankImportContext()
    const selectedAccountId =
      deps.accountId &&
      context.accounts.some((account) => account.id === deps.accountId)
        ? deps.accountId
        : ''

    const rowsPage = selectedAccountId
      ? await fetchImportedBankTransactions({
          data: {
            currentAccountId: selectedAccountId,
            page: deps.page,
            pageSize: deps.pageSize,
            search: deps.search,
            direction: deps.direction,
            status: deps.status,
          },
        })
      : {
          rows: [],
          total: 0,
          page: deps.page,
          pageSize: deps.pageSize,
          totalPages: 1,
        }

    return { ...context, rowsPage, selectedAccountId }
  },
  component: BankImportPage,
})

function BankImportPage() {
  const router = useRouter()
  const { accounts, categories, counterparties, rowsPage, selectedAccountId } =
    Route.useLoaderData()
  const searchParams = Route.useSearch()
  const rows = rowsPage.rows
  const currentPage = rowsPage.page
  const pageSize = rowsPage.pageSize
  const totalPages = rowsPage.totalPages
  const search = searchParams.search
  const directionFilter = searchParams.direction
  const statusFilter = searchParams.status

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const [attachTarget, setAttachTarget] =
    useState<ImportedBankTransactionView | null>(null)
  const [allocationDrafts, setAllocationDrafts] = useState<
    BankImportAllocationDraft[]
  >([])
  const [isSubmittingAttach, setIsSubmittingAttach] = useState(false)

  const [createTarget, setCreateTarget] =
    useState<ImportedBankTransactionView | null>(null)
  const [createDraft, setCreateDraft] = useState<BankImportCreateDraft>({
    amount: '',
    description: '',
    categoryId: '',
    counterpartyId: '',
  })
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] =
    useState<ImportedBankTransactionView | null>(null)
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  const hasActiveFilters =
    search.trim() !== '' || directionFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    void router.navigate({
      to: '/bank-import',
      search: {
        ...searchParams,
        page: 1,
        search: '',
        direction: 'all',
        status: 'all',
      },
      replace: true,
    })
  }

  useEffect(() => {
    if (!attachTarget) {
      setAllocationDrafts([])
      return
    }

    const firstCandidate = attachTarget.suggestedInvoices[0]
    if (!firstCandidate || attachTarget.remainingAmount <= 0) {
      setAllocationDrafts([{ invoiceId: '', amount: '' }])
      return
    }

    setAllocationDrafts([
      {
        invoiceId: firstCandidate.id,
        amount: String(
          Math.min(
            firstCandidate.outstandingAmount,
            attachTarget.remainingAmount,
          ),
        ),
      },
    ])
  }, [attachTarget])

  useEffect(() => {
    setAttachTarget(null)
    setCreateTarget(null)
    setDeleteTarget(null)
  }, [selectedAccountId])

  useEffect(() => {
    if (!createTarget) return

    const categoryOptions = categories.filter((category) =>
      createTarget.direction === 'credit'
        ? category.useForIncome
        : category.useForExpenses,
    )
    const guessedCounterparty = guessCounterpartyId(
      createTarget,
      counterparties,
    )

    setCreateDraft({
      amount: createTarget.remainingAmount.toFixed(2),
      description:
        createTarget.description ??
        `${createTarget.direction === 'credit' ? 'Поступление' : 'Списание'} ${
          createTarget.counterpartyName ?? ''
        }`.trim(),
      categoryId: categoryOptions[0]?.id ?? '',
      counterpartyId: guessedCounterparty ?? '',
    })
  }, [categories, counterparties, createTarget])

  const handleImport = async () => {
    if (!selectedAccountId) {
      toast.error('Выберите расчётный счёт')
      return
    }

    if (!selectedFile) {
      toast.error('Выберите файл выписки')
      return
    }

    setIsImporting(true)

    try {
      const content = await readBankStatementFile(selectedFile)
      const importedRows = await importBankStatement({
        data: {
          currentAccountId: selectedAccountId,
          content,
        },
      })

      await router.navigate({
        to: '/bank-import',
        search: {
          ...searchParams,
          accountId: selectedAccountId,
          page: 1,
          pageSize,
        },
        replace: true,
      })
      await router.invalidate()
      setSelectedFile(null)
      toast.success(
        importedRows.length > 0
          ? `Добавлено ${importedRows.length} банковских строк`
          : 'Новых банковских строк не найдено',
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Не удалось импортировать файл',
      )
    } finally {
      setIsImporting(false)
    }
  }

  const handleAttachSubmit = async () => {
    if (!attachTarget) return

    setIsSubmittingAttach(true)

    try {
      const allocations = allocationDrafts
        .map((draft) => ({
          invoiceId: draft.invoiceId,
          amount: Number(draft.amount),
        }))
        .filter(
          (draft) =>
            draft.invoiceId &&
            Number.isFinite(draft.amount) &&
            draft.amount > 0,
        )

      if (allocations.length === 0) {
        throw new Error('Добавьте хотя бы одно распределение')
      }

      await attachBankTransaction({
        data: {
          bankTransactionId: attachTarget.id,
          allocations,
        },
      })

      setAttachTarget(null)
      await router.invalidate()
      toast.success('Банковская транзакция успешно привязана')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить распределение',
      )
    } finally {
      setIsSubmittingAttach(false)
    }
  }

  const handleCreateSubmit = async () => {
    if (!createTarget) return

    setIsSubmittingCreate(true)

    try {
      if (!createDraft.categoryId) {
        throw new Error('Выберите категорию')
      }

      await createInvoiceFromBankTransaction({
        data: {
          bankTransactionId: createTarget.id,
          amount: Number(createDraft.amount),
          description: createDraft.description,
          categoryId: createDraft.categoryId,
          counterpartyId: createDraft.counterpartyId || undefined,
        },
      })

      setCreateTarget(null)
      await router.invalidate()
      toast.success('Invoice создан и сразу связан с банковской транзакцией')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Не удалось создать invoice',
      )
    } finally {
      setIsSubmittingCreate(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return

    setIsSubmittingDelete(true)

    try {
      await deleteBankTransaction({
        data: {
          bankTransactionId: deleteTarget.id,
        },
      })

      setDeleteTarget(null)
      await router.invalidate()
      toast.success('Банковская транзакция удалена')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Не удалось удалить банковскую транзакцию',
      )
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <BankImportHeader
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          isImporting={isImporting}
          onAccountChange={(value) => {
            void router.navigate({
              to: '/bank-import',
              search: {
                accountId: value || undefined,
                page: 1,
                pageSize,
                search,
                direction: directionFilter,
                status: statusFilter,
              },
              replace: true,
            })
          }}
          onFileChange={setSelectedFile}
          onImport={handleImport}
        />

        {selectedAccountId && (
          <BankImportFilters
            search={search}
            onSearchChange={(value) => {
              void router.navigate({
                to: '/bank-import',
                search: {
                  ...searchParams,
                  accountId: selectedAccountId || undefined,
                  page: 1,
                  pageSize,
                  search: value,
                },
                replace: true,
              })
            }}
            directionFilter={directionFilter}
            onDirectionFilterChange={(value) => {
              void router.navigate({
                to: '/bank-import',
                search: {
                  ...searchParams,
                  accountId: selectedAccountId || undefined,
                  page: 1,
                  pageSize,
                  direction: value,
                },
                replace: true,
              })
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => {
              void router.navigate({
                to: '/bank-import',
                search: {
                  ...searchParams,
                  accountId: selectedAccountId || undefined,
                  page: 1,
                  pageSize,
                  status: value,
                },
                replace: true,
              })
            }}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        )}

        {rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {selectedAccountId
              ? hasActiveFilters
                ? 'По текущим фильтрам ничего не найдено.'
                : 'Для выбранного счёта пока нет загруженных банковских транзакций.'
              : 'Выберите расчётный счёт, чтобы увидеть загруженные банковские транзакции.'}
          </Card>
        ) : (
          <BankImportList
            rows={rows}
            onAttach={setAttachTarget}
            onCreate={setCreateTarget}
            onDelete={setDeleteTarget}
          />
        )}

        {selectedAccountId && rowsPage.total > 0 && (
          <BankImportPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={rowsPage.total}
            pageSize={pageSize as 25 | 50 | 100}
            onPageSizeChange={(value) => {
              void router.navigate({
                to: '/bank-import',
                search: {
                  ...searchParams,
                  accountId: selectedAccountId,
                  page: 1,
                  pageSize: value,
                },
                replace: true,
              })
            }}
            onPreviousPage={() => {
              void router.navigate({
                to: '/bank-import',
                search: {
                  ...searchParams,
                  accountId: selectedAccountId,
                  page: Math.max(1, currentPage - 1),
                  pageSize,
                },
                replace: true,
              })
            }}
            onNextPage={() => {
              void router.navigate({
                to: '/bank-import',
                search: {
                  ...searchParams,
                  accountId: selectedAccountId,
                  page: Math.min(totalPages, currentPage + 1),
                  pageSize,
                },
                replace: true,
              })
            }}
          />
        )}
      </div>

      <BankImportAttachDialog
        open={attachTarget !== null}
        target={attachTarget}
        allocationDrafts={allocationDrafts}
        isSubmitting={isSubmittingAttach}
        onOpenChange={(open) => !open && setAttachTarget(null)}
        onAllocationDraftsChange={setAllocationDrafts}
        onSubmit={handleAttachSubmit}
      />

      <BankImportCreateDialog
        open={createTarget !== null}
        target={createTarget}
        draft={createDraft}
        categories={categories}
        counterparties={counterparties}
        isSubmitting={isSubmittingCreate}
        onOpenChange={(open) => !open && setCreateTarget(null)}
        onDraftChange={setCreateDraft}
        onSubmit={handleCreateSubmit}
      />

      <BankImportDeleteDialog
        open={deleteTarget !== null}
        target={deleteTarget}
        isSubmitting={isSubmittingDelete}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onSubmit={handleDeleteSubmit}
      />
    </>
  )
}

async function readBankStatementFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const windowsText = new TextDecoder('windows-1251').decode(bytes)

  if (windowsText.includes('1CClientBankExchange')) {
    return windowsText
  }

  return new TextDecoder('utf-8').decode(bytes)
}

function guessCounterpartyId(
  row: ImportedBankTransactionView,
  counterparties: {
    id: string
    name: string
    tin: string | null
  }[],
) {
  if (row.counterpartyTin) {
    const byTin = counterparties.find(
      (counterparty) => counterparty.tin === row.counterpartyTin,
    )

    if (byTin) return byTin.id
  }

  const normalizedTarget = normalizeCounterpartyName(row.counterpartyName)
  if (!normalizedTarget) return null

  const byName = counterparties.find((counterparty) => {
    const normalizedCounterparty = normalizeCounterpartyName(counterparty.name)
    return (
      normalizedCounterparty === normalizedTarget ||
      normalizedCounterparty.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedCounterparty)
    )
  })

  return byName?.id ?? null
}
