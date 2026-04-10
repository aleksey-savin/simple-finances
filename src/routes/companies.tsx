import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'

import { Building2, Pencil, Search, X } from 'lucide-react'

import { EditCompanyForm } from '@/components/companies'
import { DeleteCompany } from '@/components/companies/delete'
import { fetchCompanies } from '@/components/companies/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/companies')({
  loader: () => fetchCompanies(),
  component: CompaniesPage,
})

function CompaniesPage() {
  const companies = Route.useLoaderData()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingCompany =
    companies.find((company) => company.id === editingId) ?? null

  const query = search.trim().toLowerCase()
  const filteredCompanies = !query
    ? companies
    : companies.filter((company) => {
        const haystack = [
          company.name,
          company.accounts.map((account) => account.name).join(' '),
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })

  const hasActiveFilters = search.trim() !== ''

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по компании или счёту"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="gap-1.5"
              >
                <X className="size-3.5" />
                Сброс
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredCompanies.length} из {companies.length}
            </span>
          </div>
        </Card>

        {filteredCompanies.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:hidden">
              {filteredCompanies.map((company) => (
                <Card key={company.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{company.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {company.accounts.length > 0
                          ? company.accounts.map((item) => item.name).join(', ')
                          : 'Счета не выбраны'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(company.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteCompany companyId={company.id} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-4 sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Компания</TableHead>
                    <TableHead className="font-bold">Счета</TableHead>
                    <TableHead className="w-24 text-right font-bold">
                      Действия
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <Building2 className="size-4 text-muted-foreground" />
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.accounts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {company.accounts.map((account) => (
                              <Badge key={account.id} variant="secondary">
                                {account.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Счета не выбраны
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setEditingId(company.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteCompany companyId={company.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={editingCompany !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редактирование компании</DialogTitle>
            <DialogDescription>{editingCompany?.name}</DialogDescription>
          </DialogHeader>
          {editingCompany ? (
            <EditCompanyForm
              company={editingCompany}
              onDone={() => setEditingId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Outlet />
    </>
  )
}
