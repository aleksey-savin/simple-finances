import { AppBreadCrumbs } from './app-breadcrumbs'
import { ModeToggle } from '../mode-toggle'
import { Separator } from '../ui/separator'
import { SidebarTrigger } from '../ui/sidebar'
import Accounts from '../accounts'
import Categories from '../categories'
import {
  useAppStore,
  selectAccounts,
  selectCategories,
} from '@/store/app-store'

export const AppHeader = () => {
  const accounts = useAppStore(selectAccounts)
  const categories = useAppStore(selectCategories)

  return (
    <header
      className={`flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between`}
    >
      <div className="flex gap-4 items-center">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <AppBreadCrumbs />
      </div>
      <div className="flex gap-2 items-center">
        <Accounts accounts={accounts} />
        <Categories categories={categories} />
        <ModeToggle />
      </div>
    </header>
  )
}
