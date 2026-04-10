import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { contract, contractTypeEnum } from '@/db/schema'
import { auth } from 'utils/auth'

export const contractsQueryKey = ['contracts'] as const

export const fetchContracts = createServerFn().handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) throw new Error('Не авторизован')

  return db.query.contract
    .findMany({
      columns: {
        id: true,
        name: true,
        number: true,
        signedAt: true,
        contractType: true,
        fileUrl: true,
        amount: true,
        businessLineId: true,
        counterpartyId: true,
        createdBy: true,
      },
      with: {
        businessLine: {
          columns: {
            id: true,
            name: true,
          },
        },
        counterparty: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (table, { asc }) => asc(table.name),
    })
    .then((rows) =>
      rows.map((row) => {
        if (row.businessLine === null) {
          throw new Error('Для договора не найдено направление')
        }
        if (row.counterparty === null) {
          throw new Error('Для договора не найден контрагент')
        }

        return {
          ...row,
          businessLine: row.businessLine,
          counterparty: row.counterparty,
        }
      }),
    )
})

const amountItemSchema = z
  .string()
  .trim()
  .min(1, 'Введите сумму')
  .transform((value) => value.replace(',', '.'))
  .refine((value) => !Number.isNaN(Number(value)), 'Сумма должна быть числом')
  .refine((value) => Number(value) > 0, 'Сумма должна быть больше нуля')

const contractSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  number: z.string().trim().min(1, 'Укажите номер договора'),
  signedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату заключения'),
  contractType: z.enum(contractTypeEnum.enumValues),
  fileUrl: z.string().min(1, 'Укажите ссылку на файл'),
  businessLineId: z.string().min(1, 'Выберите направление'),
  counterpartyId: z.string().min(1, 'Выберите контрагента'),
  amount: z.array(amountItemSchema).min(1, 'Добавьте хотя бы одну сумму'),
})

export const addContractSchema = contractSchema

export const addContract = createServerFn({ method: 'POST' })
  .inputValidator(addContractSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db.insert(contract).values({
      name: data.name,
      number: data.number,
      signedAt: data.signedAt,
      contractType: data.contractType,
      fileUrl: data.fileUrl,
      businessLineId: data.businessLineId,
      counterpartyId: data.counterpartyId,
      amount: data.amount,
      createdBy: session.user.id,
    })
  })

export const updateContractSchema = contractSchema.extend({
  id: z.string(),
})

export const updateContract = createServerFn({ method: 'POST' })
  .inputValidator(updateContractSchema)
  .handler(async ({ data }) => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) throw new Error('Не авторизован')

    await db
      .update(contract)
      .set({
        name: data.name,
        number: data.number,
        signedAt: data.signedAt,
        contractType: data.contractType,
        fileUrl: data.fileUrl,
        businessLineId: data.businessLineId,
        counterpartyId: data.counterpartyId,
        amount: data.amount,
      })
      .where(eq(contract.id, data.id))
  })

const deleteContractSchema = z.object({ id: z.string() })

export const deleteContract = createServerFn({ method: 'POST' })
  .inputValidator(deleteContractSchema)
  .handler(async ({ data }) => {
    await db.delete(contract).where(eq(contract.id, data.id))
  })
