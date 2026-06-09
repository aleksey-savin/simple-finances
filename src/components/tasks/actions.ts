import { db } from '#/db/index.server'
import { task, taskList } from '#/db/schema'
import { createServerFn } from '@tanstack/react-start'

import { and, asc, eq, sql } from 'drizzle-orm'
import { requireSession } from '#/utils/session.server'
import z from 'zod'

import type { TasksData } from '#/types'

// ─── Query key ──────────────────────────────────────────────────────────────

export const tasksQueryKey = ['tasks'] as const

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchTasks = createServerFn().handler(
  async (): Promise<TasksData> => {
    const session = await requireSession()
    const userId = session.user.id

    const [lists, tasks] = await Promise.all([
      db.query.taskList.findMany({
        where: eq(taskList.createdBy, userId),
        orderBy: [asc(taskList.position), asc(taskList.createdAt)],
        columns: {
          id: true,
          name: true,
          position: true,
          icon: true,
          color: true,
        },
      }),
      db.query.task.findMany({
        where: eq(task.createdBy, userId),
        orderBy: [asc(task.position), asc(task.createdAt)],
        columns: {
          id: true,
          description: true,
          listId: true,
          finishedAt: true,
          dueDate: true,
          dayList: true,
          favourite: true,
          sourceFavouriteId: true,
          position: true,
        },
      }),
    ])

    return { lists, tasks }
  },
)

// ─── Lists ────────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Неверный цвет')

export const addTaskList = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().min(1, 'Введите название'),
      icon: z.string().nullable().optional(),
      color: hexColor.nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id

    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${taskList.position}), -1)` })
      .from(taskList)
      .where(eq(taskList.createdBy, userId))

    const [inserted] = await db
      .insert(taskList)
      .values({
        name: data.name.trim(),
        icon: data.icon ?? null,
        color: data.color ?? null,
        position: Number(max) + 1,
        createdBy: userId,
      })
      .returning({ id: taskList.id })
    return inserted.id
  })

// Update a list's appearance (icon and/or colour); only provided fields change.
export const updateTaskList = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      icon: z.string().optional(),
      color: hexColor.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()

    const set: { icon?: string; color?: string } = {}
    if (data.icon !== undefined) set.icon = data.icon
    if (data.color !== undefined) set.color = data.color
    if (Object.keys(set).length === 0) return

    await db
      .update(taskList)
      .set(set)
      .where(
        and(eq(taskList.id, data.id), eq(taskList.createdBy, session.user.id)),
      )
  })

export const deleteTaskList = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    await db
      .delete(taskList)
      .where(
        and(eq(taskList.id, data.id), eq(taskList.createdBy, session.user.id)),
      )
  })

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const addTask = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      listId: z.string(),
      description: z.string().min(1, 'Введите описание'),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id

    // The target list must belong to the user.
    const list = await db.query.taskList.findFirst({
      where: and(eq(taskList.id, data.listId), eq(taskList.createdBy, userId)),
      columns: { id: true },
    })
    if (!list) throw new Error('Список не найден')

    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${task.position}), -1)` })
      .from(task)
      .where(and(eq(task.createdBy, userId), eq(task.listId, data.listId)))

    const [inserted] = await db
      .insert(task)
      .values({
        description: data.description.trim(),
        listId: data.listId,
        position: Number(max) + 1,
        createdBy: userId,
      })
      .returning({ id: task.id })
    return inserted.id
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    await db
      .delete(task)
      .where(and(eq(task.id, data.id), eq(task.createdBy, session.user.id)))
  })

export const toggleTaskDone = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), done: z.boolean() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    await db
      .update(task)
      .set({ finishedAt: data.done ? new Date() : null })
      .where(and(eq(task.id, data.id), eq(task.createdBy, session.user.id)))
  })

// Toggle a task's favourite link. When the task is not yet linked, create a
// favourite (template) clone in the same list and point the task at it. When it
// is already linked, remove the template (the FK clears the link on every clone)
// and defensively null the link on this task.
export const toggleFavourite = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id

    const source = await db.query.task.findFirst({
      where: and(eq(task.id, data.id), eq(task.createdBy, userId)),
      columns: { description: true, listId: true, sourceFavouriteId: true },
    })
    if (!source) throw new Error('Задача не найдена')

    // Already favourited → unlink: delete the template (FK nulls clone links).
    if (source.sourceFavouriteId) {
      await db
        .delete(task)
        .where(
          and(
            eq(task.id, source.sourceFavouriteId),
            eq(task.createdBy, userId),
          ),
        )
      await db
        .update(task)
        .set({ sourceFavouriteId: null })
        .where(and(eq(task.id, data.id), eq(task.createdBy, userId)))
      return null
    }

    // Not favourited → create a template clone and link this task to it.
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${task.position}), -1)` })
      .from(task)
      .where(and(eq(task.createdBy, userId), eq(task.listId, source.listId)))

    const [inserted] = await db
      .insert(task)
      .values({
        description: source.description,
        listId: source.listId,
        favourite: true,
        dayList: false,
        finishedAt: null,
        position: Number(max) + 1,
        createdBy: userId,
      })
      .returning({ id: task.id })

    await db
      .update(task)
      .set({ sourceFavouriteId: inserted.id })
      .where(and(eq(task.id, data.id), eq(task.createdBy, userId)))

    return inserted.id
  })

export const toggleTaskDay = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), dayList: z.boolean() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    await db
      .update(task)
      .set({ dayList: data.dayList })
      .where(and(eq(task.id, data.id), eq(task.createdBy, session.user.id)))
  })

export const moveTask = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), listId: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id

    const list = await db.query.taskList.findFirst({
      where: and(eq(taskList.id, data.listId), eq(taskList.createdBy, userId)),
      columns: { id: true },
    })
    if (!list) throw new Error('Список не найден')

    await db
      .update(task)
      .set({ listId: data.listId })
      .where(and(eq(task.id, data.id), eq(task.createdBy, userId)))
  })

// Clone a favourite (template) into a target list as a fresh, undone task.
export const cloneFavourite = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      targetListId: z.string(),
      markDay: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireSession()
    const userId = session.user.id

    const source = await db.query.task.findFirst({
      where: and(eq(task.id, data.id), eq(task.createdBy, userId)),
      columns: { description: true },
    })
    if (!source) throw new Error('Задача не найдена')

    const list = await db.query.taskList.findFirst({
      where: and(
        eq(taskList.id, data.targetListId),
        eq(taskList.createdBy, userId),
      ),
      columns: { id: true },
    })
    if (!list) throw new Error('Список не найден')

    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${task.position}), -1)` })
      .from(task)
      .where(
        and(eq(task.createdBy, userId), eq(task.listId, data.targetListId)),
      )

    const [inserted] = await db
      .insert(task)
      .values({
        description: source.description,
        listId: data.targetListId,
        dayList: data.markDay,
        favourite: false,
        finishedAt: null,
        // Link the clone back to the favourite template it was created from.
        sourceFavouriteId: data.id,
        position: Number(max) + 1,
        createdBy: userId,
      })
      .returning({ id: task.id })
    return inserted.id
  })

// Set or clear a task's due date.
export const setTaskDueDate = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), dueDate: z.string().nullable() }))
  .handler(async ({ data }) => {
    const session = await requireSession()
    await db
      .update(task)
      .set({ dueDate: data.dueDate ? new Date(data.dueDate) : null })
      .where(and(eq(task.id, data.id), eq(task.createdBy, session.user.id)))
  })
