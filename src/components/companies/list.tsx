import { useState } from 'react'
import { Building2, Pencil } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import type { Company } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { companiesQueryKey, fetchCompanies } from './actions'
import { DeleteCompany } from './delete'
import { EditCompanyForm } from './form'

function CompanyRow({
  company,
  editingId,
  setEditingId,
}: {
  company: Company
  editingId: string | null
  setEditingId: (id: string | null) => void
}) {
  const isEditing = editingId === company.id

  return (
    <div className="flex flex-col">
      <Item variant={isEditing ? 'muted' : 'outline'} className="p-2">
        <ItemMedia variant="icon">
          <Building2 className="size-4 text-muted-foreground" />
        </ItemMedia>

        <ItemContent>
          <ItemTitle>{company.name}</ItemTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {company.accounts.length > 0
              ? company.accounts.map((item) => item.name).join(', ')
              : 'Счета не выбраны'}
          </p>
        </ItemContent>

        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Редактировать"
            onClick={() => setEditingId(isEditing ? null : company.id)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteCompany companyId={company.id} />
        </ItemActions>
      </Item>

      {isEditing && (
        <div className="-mt-0.5 rounded-b-md border border-t-0 bg-muted/30 px-4 pb-4">
          <EditCompanyForm
            company={company}
            onDone={() => setEditingId(null)}
          />
        </div>
      )}
    </div>
  )
}

export const CompaniesList = () => {
  const { data: companies = [] } = useQuery({
    queryKey: companiesQueryKey,
    queryFn: () => fetchCompanies(),
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">
          Все компании ({companies.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {companies.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Нет добавленных компаний
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {companies.map((company) => (
              <CompanyRow
                key={company.id}
                company={company}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
