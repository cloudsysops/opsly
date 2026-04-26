import { Client, isFullPage } from '@notionhq/client';
import type {
  CreatePageParameters,
  GetDatabaseResponse,
  PageObjectResponse,
  UpdatePageParameters,
} from '@notionhq/client/build/src/api-endpoints.js';
import {
  METRICS_PROPS,
  QUALITY_PROPS,
  SPRINT_PROPS,
  STANDUP_PROPS,
  TASK_PROPS,
} from './constants.js';
import type {
  DailyStandup,
  MetricsRow,
  QualityGate,
  Sprint,
  SprintStatus,
  Task,
  TaskPriority,
  TaskStatus,
} from './types.js';

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return v;
}

function databaseTitleFromDb(db: GetDatabaseResponse): string {
  if (!('title' in db) || !Array.isArray(db.title)) {
    return '(sin título)';
  }
  const t = db.title
    .map((x) => ('plain_text' in x ? x.plain_text : ''))
    .join('')
    .trim();
  return t.length > 0 ? t : '(sin título)';
}

function readTitle(page: PageObjectResponse, key: string): string {
  const prop = page.properties[key];
  if (prop?.type === 'title' && prop.title[0]?.plain_text) {
    return prop.title[0].plain_text;
  }
  return '';
}

function readSelect(page: PageObjectResponse, key: string): string {
  const prop = page.properties[key];
  if (prop?.type === 'select' && prop.select?.name) {
    return prop.select.name;
  }
  return '';
}

function readRichText(page: PageObjectResponse, key: string): string | undefined {
  const prop = page.properties[key];
  if (prop?.type === 'rich_text' && prop.rich_text[0]?.plain_text) {
    return prop.rich_text.map((t: { plain_text: string }) => t.plain_text).join('');
  }
  return undefined;
}

function readNumber(page: PageObjectResponse, key: string): number | undefined {
  const prop = page.properties[key];
  if (prop?.type === 'number' && typeof prop.number === 'number') {
    return prop.number;
  }
  return undefined;
}

function readUrl(page: PageObjectResponse, key: string): string | undefined {
  const prop = page.properties[key];
  if (prop?.type === 'url' && prop.url) {
    return prop.url;
  }
  return undefined;
}

function readDateStart(page: PageObjectResponse, key: string): string | undefined {
  const prop = page.properties[key];
  if (prop?.type === 'date' && prop.date?.start) {
    return prop.date.start;
  }
  return undefined;
}

function readPeopleFirstId(page: PageObjectResponse, key: string): string {
  const prop = page.properties[key];
  if (prop?.type === 'people' && prop.people[0]) {
    const p = prop.people[0];
    if ('id' in p) {
      return p.id;
    }
  }
  return '';
}

function readFormulaNumber(page: PageObjectResponse, key: string): number {
  const prop = page.properties[key];
  if (prop?.type === 'formula' && prop.formula.type === 'number') {
    return prop.formula.number ?? 0;
  }
  return 0;
}

function readRelationFirst(page: PageObjectResponse, key: string): string {
  const prop = page.properties[key];
  if (prop?.type === 'relation' && prop.relation[0]?.id) {
    return prop.relation[0].id;
  }
  return '';
}

function asTaskStatus(s: string): TaskStatus {
  const allowed: TaskStatus[] = ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done'];
  return (allowed.includes(s as TaskStatus) ? s : 'Backlog') as TaskStatus;
}

function asTaskPriority(s: string): TaskPriority {
  const allowed: TaskPriority[] = ['Low', 'Medium', 'High', 'Blocker'];
  return (allowed.includes(s as TaskPriority) ? s : 'Medium') as TaskPriority;
}

function asSprintStatus(s: string): SprintStatus {
  const allowed: SprintStatus[] = ['Planned', 'Active', 'Completed'];
  return (allowed.includes(s as SprintStatus) ? s : 'Planned') as SprintStatus;
}

function asQualityStatus(s: string): import('./types.js').QualityStatus {
  const allowed: import('./types.js').QualityStatus[] = ['Pass', 'Warn', 'Fail'];
  return (
    allowed.includes(s as import('./types.js').QualityStatus) ? s : 'Fail'
  ) as import('./types.js').QualityStatus;
}

export class NotionClient {
  private readonly notion: Client;
  private readonly dbTasks: string;
  private readonly dbSprints: string;
  private readonly dbStandup: string;
  private readonly dbQuality: string;
  private readonly dbMetrics: string;

  private async loadFullPage(pageId: string): Promise<PageObjectResponse> {
    const got = await this.notion.pages.retrieve({ page_id: pageId });
    if (!isFullPage(got)) {
      throw new Error('Se esperaba una página completa de Notion');
    }
    return got;
  }

  constructor() {
    this.notion = new Client({ auth: requireEnv('NOTION_TOKEN') });
    this.dbTasks = requireEnv('NOTION_DATABASE_TASKS');
    this.dbSprints = requireEnv('NOTION_DATABASE_SPRINTS');
    this.dbStandup = requireEnv('NOTION_DATABASE_STANDUP');
    this.dbQuality = requireEnv('NOTION_DATABASE_QUALITY');
    this.dbMetrics = requireEnv('NOTION_DATABASE_METRICS');
  }

  async listTasks(sprint?: string, status?: string): Promise<Task[]> {
    type Filter = {
      property: string;
      select: { equals: string };
    };
    const filters: Filter[] = [];
    if (sprint) {
      filters.push({ property: TASK_PROPS.sprint, select: { equals: sprint } });
    }
    if (status) {
      filters.push({ property: TASK_PROPS.status, select: { equals: status } });
    }

    let filter: Filter | { and: Filter[] } | undefined;
    if (filters.length === 0) {
      filter = undefined;
    } else if (filters.length === 1) {
      filter = filters[0];
    } else {
      filter = { and: filters };
    }

    const response = await this.notion.databases.query({
      database_id: this.dbTasks,
      filter,
    });

    return response.results
      .filter((r): r is PageObjectResponse => r.object === 'page')
      .map((page) => this.pageToTask(page));
  }

  async createTask(task: Omit<Task, 'id' | 'created' | 'updated'>): Promise<Task> {
    const props: CreatePageParameters['properties'] = {
      [TASK_PROPS.title]: {
        title: [{ type: 'text', text: { content: task.title } }],
      },
      [TASK_PROPS.sprint]: {
        select: { name: task.sprint },
      },
      [TASK_PROPS.status]: {
        select: { name: task.status },
      },
      [TASK_PROPS.priority]: {
        select: { name: task.priority },
      },
    };

    if (task.owner) {
      props[TASK_PROPS.owner] = {
        people: [{ id: task.owner }],
      };
    }
    if (task.dueDate) {
      props[TASK_PROPS.dueDate] = { date: { start: task.dueDate } };
    }
    if (task.description) {
      props[TASK_PROPS.description] = {
        rich_text: [{ type: 'text', text: { content: task.description } }],
      };
    }
    if (task.estimatedHours !== undefined) {
      props[TASK_PROPS.estimatedHours] = { number: task.estimatedHours };
    }

    const response = await this.notion.pages.create({
      parent: { database_id: this.dbTasks },
      properties: props,
    });

    if (response.object !== 'page') {
      throw new Error('Respuesta inesperada al crear tarea');
    }
    return this.pageToTask(await this.loadFullPage(response.id));
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const props: UpdatePageParameters['properties'] = {};

    if (updates.title !== undefined) {
      props[TASK_PROPS.title] = {
        title: [{ type: 'text', text: { content: updates.title } }],
      };
    }
    if (updates.status !== undefined) {
      props[TASK_PROPS.status] = {
        select: { name: updates.status },
      };
    }
    if (updates.actualHours !== undefined) {
      props[TASK_PROPS.actualHours] = { number: updates.actualHours };
    }
    if (updates.sprint !== undefined) {
      props[TASK_PROPS.sprint] = { select: { name: updates.sprint } };
    }
    if (updates.priority !== undefined) {
      props[TASK_PROPS.priority] = { select: { name: updates.priority } };
    }

    const response = await this.notion.pages.update({
      page_id: taskId,
      properties: props,
    });

    if (response.object !== 'page') {
      throw new Error('Respuesta inesperada al actualizar tarea');
    }
    return this.pageToTask(await this.loadFullPage(response.id));
  }

  async addStandup(standup: Omit<DailyStandup, 'id'>): Promise<DailyStandup> {
    const props: CreatePageParameters['properties'] = {
      [STANDUP_PROPS.title]: {
        title: [
          {
            type: 'text',
            text: { content: `Standup ${standup.date}` },
          },
        ],
      },
      [STANDUP_PROPS.date]: { date: { start: standup.date } },
      [STANDUP_PROPS.commits]: { number: standup.commits },
      [STANDUP_PROPS.testsPassing]: { number: standup.testsPassing },
      [STANDUP_PROPS.coverage]: { number: standup.coverage },
    };

    if (standup.author) {
      props[STANDUP_PROPS.author] = {
        people: [{ id: standup.author }],
      };
    }
    if (standup.blockers) {
      props[STANDUP_PROPS.blockers] = {
        rich_text: [{ type: 'text', text: { content: standup.blockers } }],
      };
    }
    if (standup.notes) {
      props[STANDUP_PROPS.notes] = {
        rich_text: [{ type: 'text', text: { content: standup.notes } }],
      };
    }

    const response = await this.notion.pages.create({
      parent: { database_id: this.dbStandup },
      properties: props,
    });

    if (response.object !== 'page') {
      throw new Error('Respuesta inesperada al crear standup');
    }
    return this.pageToStandup(await this.loadFullPage(response.id));
  }

  async recordQualityGate(gate: Omit<QualityGate, 'id' | 'lastChecked'>): Promise<QualityGate> {
    const props: CreatePageParameters['properties'] = {
      [QUALITY_PROPS.title]: {
        title: [{ type: 'text', text: { content: gate.checkName } }],
      },
      [QUALITY_PROPS.component]: {
        select: { name: gate.component },
      },
      [QUALITY_PROPS.status]: {
        select: { name: gate.status },
      },
    };
    if (gate.details) {
      props[QUALITY_PROPS.details] = {
        rich_text: [{ type: 'text', text: { content: gate.details } }],
      };
    }

    const response = await this.notion.pages.create({
      parent: { database_id: this.dbQuality },
      properties: props,
    });

    if (response.object !== 'page') {
      throw new Error('Respuesta inesperada al registrar quality gate');
    }
    return this.pageToQualityGate(await this.loadFullPage(response.id));
  }

  async recordMetrics(row: Omit<MetricsRow, 'id'>): Promise<MetricsRow> {
    const props: CreatePageParameters['properties'] = {
      [METRICS_PROPS.title]: {
        title: [{ type: 'text', text: { content: `Metrics ${row.date}` } }],
      },
      [METRICS_PROPS.date]: { date: { start: row.date } },
      [METRICS_PROPS.tasksCompleted]: { number: row.tasksCompleted },
      [METRICS_PROPS.tasksPlanned]: { number: row.tasksPlanned },
      [METRICS_PROPS.commits]: { number: row.commits },
      [METRICS_PROPS.prsMerged]: { number: row.prsMerged },
      [METRICS_PROPS.testCoverage]: { number: row.testCoverage },
    };

    if (row.sprintId) {
      props[METRICS_PROPS.sprint] = {
        relation: [{ id: row.sprintId }],
      };
    }

    const response = await this.notion.pages.create({
      parent: { database_id: this.dbMetrics },
      properties: props,
    });

    if (response.object !== 'page') {
      throw new Error('Respuesta inesperada al registrar métricas');
    }
    return this.pageToMetrics(await this.loadFullPage(response.id));
  }

  async getCurrentSprint(): Promise<Sprint | null> {
    const response = await this.notion.databases.query({
      database_id: this.dbSprints,
      filter: {
        property: SPRINT_PROPS.status,
        select: { equals: 'Active' },
      },
    });
    const first = response.results.find((r): r is PageObjectResponse => r.object === 'page');
    if (!first) {
      return null;
    }
    return this.pageToSprint(first);
  }

  /**
   * Comprueba token + IDs: retrieve de cada base (sin listar páginas).
   */
  async verifyDatabases(): Promise<{
    tasks: string;
    sprints: string;
    standup: string;
    quality: string;
    metrics: string;
  }> {
    const [tasks, sprints, standup, quality, metrics] = await Promise.all([
      this.notion.databases.retrieve({ database_id: this.dbTasks }),
      this.notion.databases.retrieve({ database_id: this.dbSprints }),
      this.notion.databases.retrieve({ database_id: this.dbStandup }),
      this.notion.databases.retrieve({ database_id: this.dbQuality }),
      this.notion.databases.retrieve({ database_id: this.dbMetrics }),
    ]);

    return {
      tasks: databaseTitleFromDb(tasks),
      sprints: databaseTitleFromDb(sprints),
      standup: databaseTitleFromDb(standup),
      quality: databaseTitleFromDb(quality),
      metrics: databaseTitleFromDb(metrics),
    };
  }

  private pageToTask(page: PageObjectResponse): Task {
    const st = readSelect(page, TASK_PROPS.status);
    const pr = readSelect(page, TASK_PROPS.priority);
    return {
      id: page.id,
      title: readTitle(page, TASK_PROPS.title),
      sprint: readSelect(page, TASK_PROPS.sprint),
      status: asTaskStatus(st || 'Backlog'),
      owner: readPeopleFirstId(page, TASK_PROPS.owner),
      assignee: readPeopleFirstId(page, TASK_PROPS.assignee) || undefined,
      dueDate: readDateStart(page, TASK_PROPS.dueDate),
      estimatedHours: readNumber(page, TASK_PROPS.estimatedHours),
      actualHours: readNumber(page, TASK_PROPS.actualHours),
      priority: asTaskPriority(pr || 'Medium'),
      prLink: readUrl(page, TASK_PROPS.prLink),
      description: readRichText(page, TASK_PROPS.description),
      created: page.created_time,
      updated: page.last_edited_time,
    };
  }

  private pageToSprint(page: PageObjectResponse): Sprint {
    return {
      id: page.id,
      name: readTitle(page, SPRINT_PROPS.title),
      phase: readSelect(page, SPRINT_PROPS.phase),
      startDate: readDateStart(page, SPRINT_PROPS.startDate) ?? '',
      endDate: readDateStart(page, SPRINT_PROPS.endDate) ?? '',
      status: asSprintStatus(readSelect(page, SPRINT_PROPS.status) || 'Planned'),
      progress: readFormulaNumber(page, SPRINT_PROPS.progressPercent),
      velocity: readNumber(page, SPRINT_PROPS.velocity) ?? 0,
    };
  }

  private pageToStandup(page: PageObjectResponse): DailyStandup {
    return {
      id: page.id,
      date: readDateStart(page, STANDUP_PROPS.date) ?? '',
      author: readPeopleFirstId(page, STANDUP_PROPS.author),
      tasksCompleted: [],
      blockers: readRichText(page, STANDUP_PROPS.blockers),
      commits: readNumber(page, STANDUP_PROPS.commits) ?? 0,
      testsPassing: readNumber(page, STANDUP_PROPS.testsPassing) ?? 0,
      coverage: readNumber(page, STANDUP_PROPS.coverage) ?? 0,
      notes: readRichText(page, STANDUP_PROPS.notes),
    };
  }

  private pageToQualityGate(page: PageObjectResponse): QualityGate {
    const st = readSelect(page, QUALITY_PROPS.status);
    return {
      id: page.id,
      checkName: readTitle(page, QUALITY_PROPS.title),
      component: readSelect(page, QUALITY_PROPS.component),
      status: asQualityStatus(st || 'Fail'),
      details: readRichText(page, QUALITY_PROPS.details),
      lastChecked: page.last_edited_time,
    };
  }

  private pageToMetrics(page: PageObjectResponse): MetricsRow {
    return {
      id: page.id,
      date: readDateStart(page, METRICS_PROPS.date) ?? '',
      sprintId: readRelationFirst(page, METRICS_PROPS.sprint),
      tasksCompleted: readNumber(page, METRICS_PROPS.tasksCompleted) ?? 0,
      tasksPlanned: readNumber(page, METRICS_PROPS.tasksPlanned) ?? 0,
      progress: readFormulaNumber(page, METRICS_PROPS.progressPercent),
      commits: readNumber(page, METRICS_PROPS.commits) ?? 0,
      prsMerged: readNumber(page, METRICS_PROPS.prsMerged) ?? 0,
      testCoverage: readNumber(page, METRICS_PROPS.testCoverage) ?? 0,
    };
  }
}
