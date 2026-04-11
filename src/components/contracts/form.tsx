import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Loader2, Minus, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import z from 'zod'

import { contractTypeEnum } from '@/db/schema'
import type { ContractType } from '@/db/types'
import type { Contract } from '@/types'
import {
  CONTRACT_FILE_ACCEPT,
  CONTRACT_FILE_MAX_SIZE_BYTES,
  CONTRACT_FILE_MAX_SIZE_MB,
  extractContractFileExtension,
  resolveContractFileMimeTypeByExtension,
} from '#/lib/contracts-file'
import {
  businessLinesQueryKey,
  fetchBusinessLines,
} from '@/components/business-lines/actions'
import {
  counterpartiesQueryKey,
  fetchCounterparties,
} from '@/components/counterparties/actions'
import {
  companiesQueryKey,
  fetchCompanies,
} from '@/components/companies/actions'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  addContract,
  contractsQueryKey,
  updateContract,
  uploadContractFile,
} from './actions'

const amountItemSchema = z
  .string()
  .trim()
  .min(1, 'Введите сумму')
  .transform((value) => value.replace(',', '.'))
  .refine((value) => !Number.isNaN(Number(value)), 'Сумма должна быть числом')
  .refine((value) => Number(value) > 0, 'Сумма должна быть больше нуля')

const uiFormSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  number: z.string().trim().min(1, 'Укажите номер договора'),
  signedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату заключения'),
  contractType: z.enum(contractTypeEnum.enumValues),
  fileUrl: z.string().min(1, 'Укажите ссылку или загрузите файл'),
  businessLineId: z.string().min(1, 'Выберите направление'),
  counterpartyId: z.string().min(1, 'Выберите контрагента'),
  companyId: z.string(),
  amount: z.array(amountItemSchema).min(1, 'Добавьте хотя бы одну сумму'),
})

const contractTypeLabel: Record<ContractType, string> = {
  customer: 'С покупателем',
  supplier: 'С поставщиком',
}

type ContractFormProps =
  | { contract?: undefined; onDone?: undefined }
  | { contract: Contract; onDone: () => void }

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать файл'))
    }

    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Не удалось прочитать файл'))
        return
      }

      const base64 = result.includes(',') ? result.split(',').at(-1) : result
      if (!base64) {
        reject(new Error('Файл пустой'))
        return
      }

      resolve(base64)
    }

    reader.readAsDataURL(file)
  })
}

export const ContractForm = ({
  contract: current,
  onDone,
}: ContractFormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = current !== undefined
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [fileInputResetKey, setFileInputResetKey] = useState(0)

  const { data: businessLines = [] } = useQuery({
    queryKey: businessLinesQueryKey,
    queryFn: () => fetchBusinessLines(),
  })
  const { data: counterparties = [] } = useQuery({
    queryKey: counterpartiesQueryKey,
    queryFn: () => fetchCounterparties(),
  })
  const { data: companies = [] } = useQuery({
    queryKey: companiesQueryKey,
    queryFn: () => fetchCompanies(),
  })

  const form = useForm({
    defaultValues: {
      name: current?.name ?? '',
      number: current?.number ?? '',
      signedAt: current?.signedAt ? String(current.signedAt).slice(0, 10) : '',
      contractType: (current?.contractType ?? 'customer') as ContractType,
      fileUrl: current?.fileUrl ?? '',
      businessLineId: current?.businessLine.id ?? '',
      counterpartyId: current?.counterparty.id ?? '',
      companyId: current?.companyId ?? '',
      amount: current?.amount ?? [''],
    },
    validators: { onSubmit: uiFormSchema },
    onSubmit: async ({ value }) => {
      try {
        if (isEdit) {
          await updateContract({
            data: {
              id: current.id,
              name: value.name,
              number: value.number,
              signedAt: value.signedAt,
              contractType: value.contractType,
              fileUrl: value.fileUrl,
              businessLineId: value.businessLineId,
              counterpartyId: value.counterpartyId,
              companyId: value.companyId || undefined,
              amount: value.amount,
            },
          })
          await router.invalidate()
          await queryClient.invalidateQueries({ queryKey: contractsQueryKey })
          await queryClient.invalidateQueries({
            queryKey: businessLinesQueryKey,
          })
          setSelectedFile(null)
          setFileInputResetKey((prev) => prev + 1)
          toast.success('Договор обновлён')
          onDone()
          return
        }

        await addContract({
          data: {
            name: value.name,
            number: value.number,
            signedAt: value.signedAt,
            contractType: value.contractType,
            fileUrl: value.fileUrl,
            businessLineId: value.businessLineId,
            counterpartyId: value.counterpartyId,
            companyId: value.companyId || undefined,
            amount: value.amount,
          },
        })
        await router.invalidate()
        await queryClient.invalidateQueries({ queryKey: contractsQueryKey })
        await queryClient.invalidateQueries({
          queryKey: businessLinesQueryKey,
        })
        form.reset()
        setSelectedFile(null)
        setFileInputResetKey((prev) => prev + 1)
        toast.success('Договор добавлен')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка')
      }
    },
  })

  return (
    <form
      id={isEdit ? 'edit-contract-form' : 'add-contract-form'}
      className={
        isEdit
          ? 'flex flex-col gap-3 pt-2'
          : 'flex-1 flex flex-col gap-4 min-h-0'
      }
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <div
        className={
          isEdit
            ? 'flex flex-col gap-3'
            : 'grid flex-1 auto-rows-min gap-4 px-4'
        }
      >
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Название</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Введите название договора"
                  autoComplete="off"
                  type="text"
                  required
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="number">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Номер договора</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="например, 123"
                    autoComplete="off"
                    type="text"
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="signedAt">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Дата заключения</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    type="date"
                    required
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>
        </div>

        <form.Field name="contractType">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Тип договора</FieldLabel>
                <Combobox
                  options={contractTypeEnum.enumValues.map((contractType) => ({
                    value: contractType,
                    label: contractTypeLabel[contractType],
                  }))}
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as ContractType)
                  }
                  placeholder="Выберите тип договора"
                  onBlur={field.handleBlur}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="fileUrl">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            const uploadSelectedContractFile = async () => {
              if (!selectedFile) {
                toast.error('Сначала выберите файл')
                return
              }

              if (selectedFile.size > CONTRACT_FILE_MAX_SIZE_BYTES) {
                toast.error(`Файл больше ${CONTRACT_FILE_MAX_SIZE_MB} МБ`)
                return
              }

              const extension = extractContractFileExtension(selectedFile.name)
              const mimeType =
                selectedFile.type ||
                resolveContractFileMimeTypeByExtension(extension) ||
                'application/octet-stream'

              try {
                setIsUploadingFile(true)
                const fileBase64 = await readFileAsBase64(selectedFile)
                const result = await uploadContractFile({
                  data: {
                    fileName: selectedFile.name,
                    mimeType,
                    fileSize: selectedFile.size,
                    fileBase64,
                  },
                })

                field.handleChange(result.fileUrl)
                field.handleBlur()
                setSelectedFile(null)
                setFileInputResetKey((prev) => prev + 1)
                toast.success('Файл загружен')
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : 'Не удалось загрузить файл',
                )
              } finally {
                setIsUploadingFile(false)
              }
            }

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Ссылка на файл</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="https://... или загрузите файл ниже"
                  autoComplete="off"
                  type="text"
                  required
                />

                <div className="mt-2 rounded-md border border-dashed p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      key={fileInputResetKey}
                      type="file"
                      accept={CONTRACT_FILE_ACCEPT}
                      className="h-auto cursor-pointer py-2"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null
                        if (!nextFile) {
                          setSelectedFile(null)
                          return
                        }

                        if (nextFile.size > CONTRACT_FILE_MAX_SIZE_BYTES) {
                          toast.error(`Файл больше ${CONTRACT_FILE_MAX_SIZE_MB} МБ`)
                          event.target.value = ''
                          setSelectedFile(null)
                          return
                        }

                        setSelectedFile(nextFile)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={uploadSelectedContractFile}
                      disabled={!selectedFile || isUploadingFile}
                    >
                      {isUploadingFile ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {isUploadingFile ? 'Загрузка...' : 'Загрузить файл'}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Форматы: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. До{' '}
                    {CONTRACT_FILE_MAX_SIZE_MB} МБ.
                  </p>
                  {selectedFile && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Выбран файл: {selectedFile.name}
                    </p>
                  )}
                </div>

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="counterpartyId">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Контрагент</FieldLabel>
                <Combobox
                  options={counterparties.map((counterparty) => ({
                    value: counterparty.id,
                    label: counterparty.name,
                  }))}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  placeholder="Выберите контрагента"
                  onBlur={field.handleBlur}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="companyId">
          {(field) => (
            <Field>
              <FieldLabel>Компания</FieldLabel>
              <Combobox
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                value={field.state.value}
                onValueChange={field.handleChange}
                onBlur={field.handleBlur}
                placeholder="Без компании"
                searchPlaceholder="Поиск компании…"
                allowClear
                clearLabel="Без компании"
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="businessLineId">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Направление</FieldLabel>
                <Combobox
                  options={businessLines.map((businessLine) => ({
                    value: businessLine.id,
                    label: businessLine.name,
                  }))}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  placeholder="Выберите направление"
                  onBlur={field.handleBlur}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="amount">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid

            const handleAmountChange = (index: number, nextValue: string) => {
              const next = [...field.state.value]
              next[index] = nextValue
              field.handleChange(next)
            }

            const addAmountRow = () => {
              field.handleChange([...field.state.value, ''])
            }

            const removeAmountRow = (index: number) => {
              if (field.state.value.length <= 1) return
              field.handleChange(
                field.state.value.filter((_, i) => i !== index),
              )
            }

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel>Суммы пакетов / этапов</FieldLabel>
                <div className="flex flex-col gap-2">
                  {field.state.value.map((amount, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={amount}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          handleAmountChange(index, event.target.value)
                        }
                        placeholder={`Сумма ${index + 1}`}
                        inputMode="decimal"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Удалить сумму"
                        onClick={() => removeAmountRow(index)}
                        disabled={field.state.value.length <= 1}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={addAmountRow}
                  >
                    <Plus className="size-4" />
                    Добавить сумму
                  </Button>
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <Button type="submit" disabled={isUploadingFile}>
          {isEdit ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  )
}

export const AddContractForm = () => <ContractForm />

export const EditContractForm = ({
  contract,
  onDone,
}: {
  contract: Contract
  onDone: () => void
}) => <ContractForm contract={contract} onDone={onDone} />
