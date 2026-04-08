import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { companiesQueryKey, deleteCompany } from './actions'

export const DeleteCompany = ({ companyId }: { companyId: string }) => {
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    try {
      await deleteCompany({ data: { id: companyId } })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: companiesQueryKey })
      toast.success('Компания удалена')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-destructive hover:text-destructive"
      title="Удалить"
      onClick={handleDelete}
    >
      <Trash2 className="size-3.5" />
    </Button>
  )
}
